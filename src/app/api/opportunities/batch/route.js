import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Helper to convert Excel serial dates or date strings to YYYY-MM-DD
function normalizeDate(val, fallbackDate = null) {
  if (!val) return fallbackDate;
  
  if (typeof val === 'number') {
    // Excel serial number (days since Dec 30 1899)
    try {
      const utcDays = Math.floor(val - 25569);
      const utcValue = utcDays * 86400;
      const dateInfo = new Date(utcValue * 1000);
      const yyyy = dateInfo.getUTCFullYear();
      const mm = String(dateInfo.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(dateInfo.getUTCDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch {
      return fallbackDate;
    }
  }

  const str = String(val).trim();
  if (!str) return fallbackDate;

  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Handle DD/MM/YYYY or MM/DD/YYYY or DD-MM-YYYY
  const parts = str.split(/[/.-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY/MM/DD
      const y = parts[0];
      const m = parts[1].padStart(2, '0');
      const d = parts[2].padStart(2, '0');
      return `${y}-${m}-${d}`;
    } else if (parts[2].length === 4) {
      // DD/MM/YYYY or MM/DD/YYYY -> try parsing standard Date
      const dObj = new Date(str);
      if (!isNaN(dObj.getTime())) {
        return dObj.toISOString().split('T')[0];
      }
    }
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return fallbackDate;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const items = Array.isArray(body) ? body : (body.opportunities || []);
    const skipDuplicates = body.skipDuplicates !== undefined ? Boolean(body.skipDuplicates) : true;
    const generateTasks = Boolean(body.generateTasks);

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No opportunity records provided for import' }, { status: 400 });
    }

    // 1. Fetch dropdown options and users for name resolution
    const [dropdownsRes, usersRes] = await Promise.all([
      query('SELECT id, category, option_name FROM dropdown_options WHERE active = true'),
      query('SELECT username, name FROM resource_profiles')
    ]);

    const dropdownMap = {};
    for (const d of dropdownsRes.rows) {
      const cat = d.category.toLowerCase();
      if (!dropdownMap[cat]) dropdownMap[cat] = new Map();
      dropdownMap[cat].set(d.option_name.toLowerCase().trim(), d.id);
    }

    const userLookup = new Map();
    for (const u of usersRes.rows) {
      userLookup.set(u.username.toLowerCase().trim(), u.username);
      if (u.name) {
        userLookup.set(u.name.toLowerCase().trim(), u.username);
      }
    }

    // Default fallbacks for dropdowns
    const defaultOppType = dropdownMap['opportunity_type']?.get('rfp response') 
      || dropdownMap['opportunity_type']?.get('new business') 
      || (dropdownsRes.rows.find(d => d.category === 'opportunity_type')?.id);

    const defaultDealStage = dropdownMap['deal_stage']?.get('won')
      || dropdownMap['deal_stage']?.get('discovery')
      || (dropdownsRes.rows.find(d => d.category === 'deal_stage')?.id);

    const defaultPriority = dropdownMap['priority']?.get('medium')
      || (dropdownsRes.rows.find(d => d.category === 'priority')?.id);

    const defaultComplexity = dropdownMap['complexity']?.get('medium')
      || (dropdownsRes.rows.find(d => d.category === 'complexity')?.id);

    // Fallback users
    const defaultSalesOwner = userLookup.get('john_smith') || usersRes.rows[0]?.username || 'admin';
    const defaultPresalesOwner = userLookup.get('jane_doe') || usersRes.rows[0]?.username || 'admin';

    // 2. Fetch existing opportunity names + companies to check duplicates fast
    const existingRes = await query('SELECT LOWER(TRIM(company)) as company, LOWER(TRIM(opportunity_name)) as opp_name FROM opportunities');
    const existingSet = new Set(existingRes.rows.map(r => `${r.company}|||${r.opp_name}`));

    const imported = [];
    const skipped = [];
    const errors = [];

    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      const rowIndex = i + 1;

      const oppName = String(row.opportunity_name || row['Opportunity Name'] || row['Opportunity'] || row['Deal Name'] || '').trim();
      const company = String(row.company || row['Company'] || row['Account'] || row['Client'] || '').trim();

      if (!oppName || !company) {
        errors.push({
          row: rowIndex,
          name: oppName || '(Empty)',
          company: company || '(Empty)',
          error: 'Missing required Opportunity Name or Company'
        });
        continue;
      }

      // Check duplicate
      const dupKey = `${company.toLowerCase()}|||${oppName.toLowerCase()}`;
      if (existingSet.has(dupKey)) {
        if (skipDuplicates) {
          skipped.push({
            row: rowIndex,
            name: oppName,
            company: company,
            reason: 'Already exists in database'
          });
          continue;
        } else {
          errors.push({
            row: rowIndex,
            name: oppName,
            company: company,
            error: 'Duplicate: An opportunity with this name and company already exists'
          });
          continue;
        }
      }

      // Resolve Opportunity Type
      let oppTypeId = null;
      const rawOppType = String(row.opportunity_type || row['Opportunity Type'] || row.opportunity_type_id || '').trim();
      if (rawOppType) {
        if (!isNaN(Number(rawOppType)) && dropdownsRes.rows.some(d => d.id === Number(rawOppType) && d.category === 'opportunity_type')) {
          oppTypeId = Number(rawOppType);
        } else {
          oppTypeId = dropdownMap['opportunity_type']?.get(rawOppType.toLowerCase()) || null;
        }
      }
      if (!oppTypeId) oppTypeId = defaultOppType;

      // Resolve Deliverable Type
      let delivTypeId = null;
      const rawDelivType = String(row.deliverable_type || row['Deliverable Type'] || row.deliverable_type_id || '').trim();
      if (rawDelivType) {
        if (!isNaN(Number(rawDelivType)) && dropdownsRes.rows.some(d => d.id === Number(rawDelivType) && d.category === 'deliverable_type')) {
          delivTypeId = Number(rawDelivType);
        } else {
          delivTypeId = dropdownMap['deliverable_type']?.get(rawDelivType.toLowerCase()) || null;
        }
      }

      // Resolve Deal Stage
      let stageId = null;
      const rawStage = String(row.deal_stage || row['Deal Stage'] || row['Stage'] || row['Status'] || row.deal_stage_id || '').trim();
      if (rawStage) {
        if (!isNaN(Number(rawStage)) && dropdownsRes.rows.some(d => d.id === Number(rawStage) && d.category === 'deal_stage')) {
          stageId = Number(rawStage);
        } else {
          stageId = dropdownMap['deal_stage']?.get(rawStage.toLowerCase()) || null;
          // Substring match if exact match not found (e.g. 'poc' -> 'POC(Proof Of Concept)')
          if (!stageId) {
            for (const [name, id] of dropdownMap['deal_stage']?.entries() || []) {
              if (name.includes(rawStage.toLowerCase()) || rawStage.toLowerCase().includes(name)) {
                stageId = id;
                break;
              }
            }
          }
        }
      }
      if (!stageId) stageId = defaultDealStage;

      // Resolve Priority
      let prioId = null;
      const rawPrio = String(row.priority || row['Priority'] || row.priority_id || '').trim();
      if (rawPrio) {
        if (!isNaN(Number(rawPrio)) && dropdownsRes.rows.some(d => d.id === Number(rawPrio) && d.category === 'priority')) {
          prioId = Number(rawPrio);
        } else {
          prioId = dropdownMap['priority']?.get(rawPrio.toLowerCase()) || null;
        }
      }
      if (!prioId) prioId = defaultPriority;

      // Resolve Complexity
      let compId = null;
      const rawComp = String(row.complexity || row['Complexity'] || row.complexity_id || '').trim();
      if (rawComp) {
        if (!isNaN(Number(rawComp)) && dropdownsRes.rows.some(d => d.id === Number(rawComp) && d.category === 'complexity')) {
          compId = Number(rawComp);
        } else {
          compId = dropdownMap['complexity']?.get(rawComp.toLowerCase()) || null;
        }
      }
      if (!compId) compId = defaultComplexity;

      // Resolve Source
      let sourceId = null;
      const rawSource = String(row.source || row['Source'] || row.source_id || '').trim();
      if (rawSource) {
        if (!isNaN(Number(rawSource)) && dropdownsRes.rows.some(d => d.id === Number(rawSource) && d.category === 'source')) {
          sourceId = Number(rawSource);
        } else {
          sourceId = dropdownMap['source']?.get(rawSource.toLowerCase()) || null;
        }
      }

      // Resolve Owners / Users
      const rawSalesOwner = String(row.primary_sales_owner || row['Primary Sales Owner'] || row['Sales Owner'] || '').trim();
      const primarySalesOwner = userLookup.get(rawSalesOwner.toLowerCase()) || rawSalesOwner || defaultSalesOwner;

      const rawPresalesOwner = String(row.presales_owner || row['Presales Owner'] || row['Presales Lead'] || '').trim();
      const presalesOwner = userLookup.get(rawPresalesOwner.toLowerCase()) || rawPresalesOwner || defaultPresalesOwner;

      const rawDeliveryTeam = String(row.delivery_team || row['Delivery Team'] || row['Delivery Lead'] || '').trim();
      const deliveryTeam = userLookup.get(rawDeliveryTeam.toLowerCase()) || rawDeliveryTeam || null;

      // Project Type
      const projectType = String(row.project_type || row['Project Type'] || '').trim() || null;

      // Financials
      const rawTcv = row.tcv_amount !== undefined ? row.tcv_amount : (row['TCV'] || row['Total Contract Value'] || row.estimated_deal_value || row['Estimated Value'] || 0);
      const cleanTcv = typeof rawTcv === 'string' ? parseFloat(rawTcv.replace(/[^0-9.-]+/g, '')) : parseFloat(rawTcv);
      const tcvAmount = isNaN(cleanTcv) ? 0.0 : cleanTcv;
      const tcvCurrency = String(row.tcv_currency || row['Currency'] || 'USD').toUpperCase().trim() || 'USD';
      const contractTenure = parseInt(row.contract_tenure || row['Contract Tenure'] || row['Tenure (Months)'] || 12, 10) || 12;
      const winProb = parseInt(row.win_probability || row['Win Probability'] || row['Win %'] || 100, 10) || 100;
      const financeStatus = String(row.finance_status || row['Finance Status'] || 'Pending').trim();

      // Dates
      const recDateRaw = row.received_date || row['Received Date'] || row['Start Date'] || todayStr;
      const recDate = normalizeDate(recDateRaw, todayStr);

      const targetDateRaw = row.target_submission_date || row['Target Submission Date'] || row['Target Date'] || row['Due Date'] || recDate;
      let targetDate = normalizeDate(targetDateRaw, recDate);
      // Ensure target date is not before received date
      if (targetDate && recDate && new Date(targetDate) < new Date(recDate)) {
        targetDate = recDate;
      }

      const reviewDateRaw = row.internal_review_date || row['Internal Review Date'] || null;
      const reviewDate = normalizeDate(reviewDateRaw, null);

      // Strings
      const secSalesOwners = String(row.secondary_sales_owners || row['Secondary Sales Owners'] || '').trim();
      const supPresales = String(row.supporting_presales_members || row['Supporting Presales'] || '').trim();
      const summary = String(row.summary || row['Summary'] || row['Description'] || '').trim();
      const risks = String(row.risks || row['Risks'] || '').trim();
      const specialInstructions = String(row.special_instructions || row['Special Instructions'] || row['Notes'] || '').trim();

      try {
        const oppResult = await query(
          `INSERT INTO opportunities (
            opportunity_name, company, opportunity_type_id, deliverable_type_id, primary_sales_owner, secondary_sales_owners,
            delivery_team, project_type, source_id, deal_stage_id, priority_id, estimated_deal_value, contract_tenure,
            win_probability, complexity_id, received_date, target_submission_date, internal_review_date,
            presales_owner, supporting_presales_members, summary, risks, special_instructions,
            tcv_amount, tcv_currency, finance_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
          RETURNING *`,
          [
            oppName,
            company,
            oppTypeId,
            delivTypeId,
            primarySalesOwner,
            secSalesOwners,
            deliveryTeam,
            projectType,
            sourceId,
            stageId,
            prioId,
            tcvAmount,
            contractTenure,
            winProb,
            compId,
            recDate,
            targetDate,
            reviewDate,
            presalesOwner,
            supPresales,
            summary,
            risks,
            specialInstructions,
            tcvAmount,
            tcvCurrency,
            financeStatus
          ]
        );

        const newOpp = oppResult.rows[0];
        existingSet.add(dupKey);
        imported.push({
          id: newOpp.id,
          opportunity_name: newOpp.opportunity_name,
          company: newOpp.company
        });

        // If task generation is requested
        if (generateTasks) {
          try {
            let templateQuery = 'SELECT * FROM task_templates';
            let templateParams = [];
            if (delivTypeId) {
              templateQuery += ' WHERE deliverable_type_id = $1';
              templateParams.push(delivTypeId);
            }
            templateQuery += ' ORDER BY sequence ASC';

            let templates = await query(templateQuery, templateParams);
            if (templates.rows.length === 0 && delivTypeId) {
              templates = await query('SELECT * FROM task_templates ORDER BY sequence ASC');
            }

            if (templates.rows.length > 0) {
              const notStartedRes = await query("SELECT id FROM dropdown_options WHERE category = 'task_status' AND option_name = 'Not Started' LIMIT 1");
              const notStartedId = notStartedRes.rows[0]?.id || null;

              for (const t of templates.rows) {
                await query(
                  `INSERT INTO work_items (
                    opportunity_id, work_category_id, deliverable_type_id, title, description, assigned_to,
                    priority_id, start_date, due_date, estimated_hours, status_id
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                  [
                    newOpp.id,
                    t.work_category_id || null,
                    t.deliverable_type_id || delivTypeId || null,
                    t.task_name,
                    `Imported template task`,
                    presalesOwner,
                    prioId || null,
                    recDate,
                    targetDate,
                    t.default_estimated_hours || 4.0,
                    notStartedId
                  ]
                );
              }
            }
          } catch (taskErr) {
            console.warn(`Task template generation skipped for opp #${newOpp.id}:`, taskErr.message);
          }
        }
      } catch (insertErr) {
        errors.push({
          row: rowIndex,
          name: oppName,
          company: company,
          error: insertErr.message
        });
      }
    }

    // Batch Audit Log
    try {
      const realUser = request.headers.get('x-real-user') || 'admin';
      const actingAsUser = request.headers.get('x-acting-as-user') || null;
      const { logActivity } = await import('@/lib/auditLogger');
      await logActivity({
        real_user_id: realUser,
        acting_as_user_id: actingAsUser,
        entity_type: 'Opportunity',
        entity_id: imported[0]?.id || 0,
        entity_title: `Bulk Import (${imported.length} opportunities)`,
        action_type: 'Created',
        summary_text: `Batch imported ${imported.length} opportunities (Skipped: ${skipped.length}, Errors: ${errors.length})`
      });
    } catch (auditErr) {
      console.warn('Batch import audit log skipped:', auditErr.message);
    }

    return NextResponse.json({
      success: true,
      importedCount: imported.length,
      skippedCount: skipped.length,
      errorCount: errors.length,
      imported,
      skipped,
      errors
    });
  } catch (error) {
    console.error('Batch import failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
