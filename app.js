// ================= Global Variables =================
const SESSION_DURATION = 6 * 60 * 60 * 1000;
let currentUser = '';

let rawBillingData = [];
let auditData = [];
let readyData = [];
let bkgTotalsGlobal = {}; 

let filteredAudit = [];
let filteredReady = [];
let groupedReadyGlobal = {}; 

let rawHistoryData = [];
let filteredHistoryData = [];
let histSortCol = 'invoiceNo';
let histSortAsc = false;

// ================= UI Interactions & Listeners =================

document.addEventListener('focusin', function(e) { 
    if (e.target.tagName === 'INPUT' && e.target.type === 'number') { 
        if (e.target.value === '0') {
            e.target.value = ''; 
        } else {
            e.target.select(); 
        }
    } 
});

document.addEventListener('focusout', function(e) { 
    if (e.target.tagName === 'INPUT' && e.target.type === 'number') { 
        if (e.target.value === '') { 
            e.target.value = '0'; 
            e.target.dispatchEvent(new Event('input')); 
        } 
    } 
});

document.querySelectorAll('#pills-tab button').forEach(btn => {
    btn.addEventListener('click', function (event) { 
        
        document.querySelectorAll('#pills-tab button').forEach(b => {
            b.classList.remove('active-audit', 'active-invoice', 'active-history');
        });
        
        if (event.target.id === 'tab-audit') {
            event.target.classList.add('active-audit');
        }
        if (event.target.id === 'tab-invoice') {
            event.target.classList.add('active-invoice');
        }
        if (event.target.id === 'tab-history') {
            event.target.classList.add('active-history');
        }
        
        document.querySelectorAll('.tab-pane').forEach(pane => { 
            pane.classList.remove('show', 'active'); 
            pane.style.display = 'none'; 
        });
        
        const targetPane = document.querySelector(event.target.getAttribute('data-bs-target'));
        
        if (targetPane) { 
            targetPane.classList.add('show', 'active'); 
            targetPane.style.display = 'flex'; 
        }
    });
});

// ================= On Load & Login =================
window.onload = function() {
    // ให้กด Enter ในช่องรหัสผ่านแล้วเข้าทำงานฟังก์ชัน doLogin
    document.getElementById('loginPassword').addEventListener('keypress', function (e) { 
        if (e.key === 'Enter') {
            e.preventDefault(); // ป้องกันการรีเฟรชหน้าเว็บกรณีติดฟอร์ม
            doLogin(); 
        }
    });
  
    const storedUser = localStorage.getItem('billingUser'); 
    const loginTime = localStorage.getItem('billingLoginTime');
    const storedToken = localStorage.getItem('billingToken');
  
    if (storedUser && loginTime && storedToken && (new Date().getTime() - parseInt(loginTime) < SESSION_DURATION)) {
        currentUser = storedUser; 
        document.getElementById('displayUser').innerText = currentUser;
        document.getElementById('loginSection').style.display = 'none'; 
        document.getElementById('mainApp').style.display = 'flex';
        loadBillingData(true); 
    }
};

async function doLogin() {
    const pwd = document.getElementById('loginPassword').value;
    const btn = document.querySelector('.btn-login');
    
    if (!pwd) {
        return Swal.fire({
            icon: 'warning', 
            text: 'กรุณากรอกรหัสผ่าน', 
            toast: true, 
            position: 'top-end', 
            showConfirmButton: false, 
            timer: 2000
        });
    }

    // ป้องกันการกดปุ่มหรือ Enter เบิ้ล (ถ้าปุ่มถูกปิดอยู่ ให้หยุดการทำงานทันที)
    if (btn.disabled) return;
    
    // ล็อกหน้าตาปุ่มต้นฉบับไว้ตายตัว
    const originalBtnHTML = `<span class="fw-bold fs-6 tracking-wide">AUTHENTICATE</span> <i class="bi bi-rocket-takeoff-fill ms-2 animate-fly"></i>`;
    
    // เปลี่ยนปุ่มให้เป็น Loading Spinner เพื่อให้รู้ว่ากดติดแล้ว และป้องกันการกดซ้ำ
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span><span class="fw-bold fs-6 tracking-wide">กำลังเข้าสู่ระบบ...</span>`;
    btn.disabled = true;
    
    try {
        const res = await callAPI('verifyLogin', { password: pwd }, 0);
        
        if (res.success) {
            currentUser = res.userName; 
            localStorage.setItem('billingUser', currentUser); 
            localStorage.setItem('billingToken', res.token); 
            localStorage.setItem('billingLoginTime', new Date().getTime().toString());
            
            document.getElementById('displayUser').innerText = currentUser;
            document.getElementById('loginSection').style.display = 'none'; 
            document.getElementById('mainApp').style.display = 'flex';
            
            // คืนค่าปุ่มกลับมาเผื่อในกรณีที่ล็อกเอาท์ออกมา
            btn.innerHTML = originalBtnHTML;
            btn.disabled = false;
                document.getElementById('loginPassword').value = '';    
                setTimeout(() => {
                    loadBillingData(true); 
                }, 1000);
            } else { 
            Swal.fire({
                icon: 'error', 
                text: res.message, 
                customClass: {popup: 'rounded-4'}
            }); 
            // คืนค่าปุ่มกลับมาเหมือนเดิมเพื่อให้กดใหม่ได้
            btn.innerHTML = originalBtnHTML;
            btn.disabled = false;
        }
    } catch(err) { 
        Swal.fire('เกิดข้อผิดพลาด', err.message, 'error'); 
        // คืนค่าปุ่มกลับมาเหมือนเดิมเพื่อให้กดใหม่ได้
        btn.innerHTML = originalBtnHTML;
        btn.disabled = false;
    }
}

function logout() { 
    localStorage.removeItem('billingUser'); 
    localStorage.removeItem('billingLoginTime'); 
    localStorage.removeItem('billingToken');
    currentUser = '';
    
    document.getElementById('loginPassword').value = ''; 
    document.getElementById('mainApp').style.display = 'none'; 
    document.getElementById('loginSection').style.display = 'block'; 
    
    // คืนค่าปุ่มเข้าสู่ระบบกลับมาเหมือนเดิม
    const btn = document.querySelector('.btn-login');
    if (btn) {
        btn.innerHTML = `<span class="fw-bold fs-6 tracking-wide">AUTHENTICATE</span> <i class="bi bi-rocket-takeoff-fill ms-2 animate-fly"></i>`;
        
    }
}

// ================= Data Loading =================
async function loadBillingData(isLogin = false) {
    Swal.fire({ 
        title: 'กำลังซิงค์ข้อมูล...', 
        text: 'กำลังโหลดข้อมูลจากคลาวด์', 
        allowOutsideClick: false, 
        didOpen: () => Swal.showLoading(), 
        customClass: {popup: 'rounded-4'} 
    });
    
    try {
        const res = await callAPI('getPendingAndReadyBilling');
        
        rawBillingData = res.data || [];
        bkgTotalsGlobal = res.bkgTotals || {}; 
        
        auditData = []; 
        readyData = [];
        
        if (rawBillingData.length > 1) {
            for (let i = 1; i < rawBillingData.length; i++) {
                let r = rawBillingData[i]; 
                let status = r[15];
                
                let price = parseFloat(r[17]) || 0; 
                let ext1 = parseFloat(r[20]) || 0; 
                let ext2 = parseFloat(r[21]) || 0; 
                let ext3 = parseFloat(r[22]) || 0;
                
                let adv1 = parseFloat(r[18]) || 0; 
                let adv2 = parseFloat(r[19]) || 0; 
                let adv3 = parseFloat(r[24]) || 0; 
                let adv4 = parseFloat(r[25]) || 0; 
                let adv5 = parseFloat(r[26]) || 0; 
                let adv6 = parseFloat(r[27]) || 0; 
                
                let ext_v1 = parseFloat(r[29]) || 0; 
                let ext_v2 = parseFloat(r[31]) || 0; 
                
                let incTot = price + ext1 + ext2 + ext3; 
                let advTot = adv1 + adv2 + adv3 + adv4 + adv5 + adv6 + ext_v1 + ext_v2;
                
                let rowObj = { 
                    rowData: r, 
                    rowIdx: r[r.length - 1], 
                    incTot: incTot, 
                    advTot: advTot, 
                    grandTot: incTot + advTot 
                };
                
                if (status === 'จบงานรอวางบิล') {
                    auditData.push(rowObj); 
                } else if (status === 'พร้อมวางบิล') {
                    readyData.push(rowObj);
                }
            }
        }
        
        let allCust = [...new Set(rawBillingData.slice(1).map(r => r[4]).filter(v => v))]; 
        let ddlCust = '<option value="">- ลูกค้าทั้งหมด -</option>'; 
        allCust.forEach(c => ddlCust += `<option value="${c}">${c}</option>`);
        
        if(document.getElementById('filterCustomerA')) {
            document.getElementById('filterCustomerA').innerHTML = ddlCust; 
        }
        if(document.getElementById('filterCustomerR')) {
            document.getElementById('filterCustomerR').innerHTML = ddlCust;
        }
        
        let allCS = [...new Set(rawBillingData.slice(1).map(r => r[1]).filter(v => v))]; 
        let ddlCS = '<option value="">- CS ทั้งหมด -</option>'; 
        allCS.forEach(c => ddlCS += `<option value="${c}">${c}</option>`);
        
        if(document.getElementById('filterCSA')) {
            document.getElementById('filterCSA').innerHTML = ddlCS;
        }
        
        Swal.close(); 
        applyFilterAudit(); 
        applyFilterReady();
        
        if (isLogin) { 
            let defaultTab = document.getElementById('tab-audit'); 
            if(defaultTab) {
                defaultTab.click(); 
            }
        } else { 
            if (document.getElementById('tab-history') && document.getElementById('tab-history').classList.contains('active-history')) {
                loadHistory(); 
            }
        }
        
        const compList = await callAPI('getCompanyList'); 
        let cHtml = ''; 
        compList.forEach(c => cHtml += `<option value="${c}">`);
        
        let mList = document.getElementById('modalCompanyList'); 
        if(mList) {
            mList.innerHTML = cHtml;
        }
        
    } catch(err) { 
        Swal.fire('ซิงค์ข้อมูลไม่สำเร็จ', err.message, 'error'); 
    }
}

// ================= TAB 1 : Audit =================
function applyFilterAudit() {
    let fSearch = document.getElementById('filterSearchA') ? document.getElementById('filterSearchA').value.toLowerCase() : '';
    let fCS = document.getElementById('filterCSA') ? document.getElementById('filterCSA').value.toLowerCase() : '';
    let fCust = document.getElementById('filterCustomerA') ? document.getElementById('filterCustomerA').value.toLowerCase() : '';
    
    filteredAudit = auditData.filter(obj => {
        let r = obj.rowData;
        let matchCust = fCust === '' || (r[4] && r[4].toString().toLowerCase().includes(fCust)); 
        let matchCS = fCS === '' || (r[1] && r[1].toString().toLowerCase().includes(fCS));
        let matchSearch = fSearch === '' || 
                          (r[6]||'').toString().toLowerCase().includes(fSearch) || 
                          (r[23]||'').toString().toLowerCase().includes(fSearch) || 
                          (r[16]||'').toString().toLowerCase().includes(fSearch);
                          
        return matchCust && matchCS && matchSearch;
    });
    
    renderAuditTab();
}

function clearFilterAudit() {
    if(document.getElementById('filterCustomerA')) document.getElementById('filterCustomerA').value = ''; 
    if(document.getElementById('filterCSA')) document.getElementById('filterCSA').value = ''; 
    if(document.getElementById('filterSearchA')) document.getElementById('filterSearchA').value = ''; 
    
    applyFilterAudit();
}

function renderAuditTab() {
    let html = '';
    
    if(filteredAudit.length === 0) {
        document.getElementById('auditBody').innerHTML = '<tr><td colspan="7" class="text-center py-5 text-muted"><i class="bi bi-box-seam fs-1 d-block mb-3 opacity-25"></i>ไม่พบรายการข้อมูล</td></tr>';
        document.getElementById('selCountA').innerText = 0; 
        return;
    }
    
    let grouped = {};
    filteredAudit.forEach(obj => { 
        let r = obj.rowData; 
        let bkg = r[6]; 
        
        if(!grouped[bkg]) {
            grouped[bkg] = { cs: r[1], customer: r[4], date: r[0], items: [], sumTot: 0 }; 
        }
        
        grouped[bkg].items.push(obj); 
        grouped[bkg].sumTot += obj.grandTot; 
    });
    
    let bkgKeys = Object.keys(grouped); 
    let limitVal = document.getElementById('limitA') ? document.getElementById('limitA').value : 'ALL';
    
    if (limitVal !== 'ALL') {
        bkgKeys = bkgKeys.slice(0, parseInt(limitVal));
    }

    for (let bkg of bkgKeys) {
        let group = grouped[bkg]; 
        let dateStr = new Date(group.date).toLocaleDateString('en-GB'); 
        let totalInSystem = bkgTotalsGlobal[bkg] || group.items.length;
        let badgeClass = group.items.length < totalInSystem ? 'bg-warning bg-opacity-25 text-warning border border-warning' : 'bg-secondary bg-opacity-10 text-secondary';
        let safeBkg = 'bkg_' + bkg.replace(/[^a-zA-Z0-9]/g, '_');

        html += `
            <tr class="parent-row bg-white" onclick="toggleDetailA('${safeBkg}')">
                <td class="text-center align-middle" onclick="event.stopPropagation();">
                    <input type="checkbox" class="bkg-check-a form-check-input shadow-sm" data-bkg="${bkg}" data-safebkg="${safeBkg}" style="width:1.2em; height:1.2em;" onclick="toggleBookingA(this, '${safeBkg}')">
                </td>
                <td>
                    <i class="bi bi-chevron-right ms-1 me-2 text-primary fw-bold" id="icon-a-${safeBkg}" style="font-size:0.8rem; transition:0.3s;"></i> ${dateStr}
                </td>
                <td class="text-secondary fw-medium">${group.cs || '-'}</td>
                <td class="fw-bold text-dark">${group.customer || '-'}</td>
                <td class="fw-bold text-primary">${bkg}</td>
                <td class="text-center">
                    <span class="badge ${badgeClass} rounded-pill px-3">${group.items.length} / ${totalInSystem}</span>
                </td>
                <td class="text-end fw-bold text-dark pe-4" id="pa-tot-${safeBkg}">
                    ฿${group.sumTot.toLocaleString(undefined, {minimumFractionDigits:2})}
                </td>
            </tr>
        `;

        group.items.forEach((obj) => {
            let r = obj.rowData; 
            let total = obj.grandTot;
            
            html += `
                <tr class="detail-row detail-a-${safeBkg} item-container-a" style="display: none;">
                    <td class="text-center align-top pt-4">
                        <input type="checkbox" class="row-check-a check-a-${safeBkg} form-check-input shadow-sm mt-2" value="${obj.rowIdx}" data-tot="${total}" style="width:1.1em; height:1.1em;" onclick="calcSummaryA()">
                    </td>
                    <td colspan="6">
                        <div class="detail-card border-0 shadow-sm" style="background:#f8fafc;">
                            
                            <div class="d-flex justify-content-between align-items-center mb-3">
                               <div>
                                   <span class="badge bg-white text-secondary border px-2 py-1 shadow-sm me-2">${r[2] || '-'}</span>
                                   <span class="badge bg-white text-dark border px-2 py-1 shadow-sm me-2"><i class="bi bi-truck me-1 text-primary"></i> ${r[16]||'-'}</span>
                                   <span class="text-secondary fw-bold small ms-2">ตู้คอนเทนเนอร์: <span class="text-primary fs-6">${r[23]||''}</span></span>
                               </div>
                               <div class="fw-bold text-primary bg-white border px-3 py-1 shadow-sm rounded-pill small">
                                   รวมรายการนี้: <span class="row-tot-a ms-1">฿${total.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
                               </div>
                            </div>
                            
                            <div class="row g-3">
                               
                               <div class="col-md-5">
                                  <div class="bg-white border rounded-4 p-3 shadow-sm h-100">
                                      <div class="d-flex justify-content-between mb-3">
                                          <span class="text-success fw-bold"><i class="bi bi-arrow-up-right-circle me-1"></i>รายได้ (Income)</span>
                                          <span class="text-success fw-bold fs-6 row-inc-a">฿${obj.incTot.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
                                      </div>
                                      <div class="row g-2">
                                          <div class="col-6">
                                              <label class="small text-muted mb-1 fw-medium">ราคาเที่ยว</label>
                                              <input type="number" class="form-control form-control-sm text-end inp-inc-a in-p" data-name="ราคาเที่ยว" data-orig="${parseFloat(r[17])||0}" value="${parseFloat(r[17])||0}" oninput="updateCalcA(this, '${safeBkg}')">
                                          </div>
                                          <div class="col-6">
                                              <label class="small text-muted mb-1 fw-medium">ต่อระยะ</label>
                                              <input type="number" class="form-control form-control-sm text-end inp-inc-a in-ext1" data-name="ต่อระยะ" data-orig="${parseFloat(r[20])||0}" value="${parseFloat(r[20])||0}" oninput="updateCalcA(this, '${safeBkg}')">
                                          </div>
                                          <div class="col-6">
                                              <label class="small text-muted mb-1 fw-medium">ค้างหาง</label>
                                              <input type="number" class="form-control form-control-sm text-end inp-inc-a in-ext2" data-name="ค้างหาง" data-orig="${parseFloat(r[21])||0}" value="${parseFloat(r[21])||0}" oninput="updateCalcA(this, '${safeBkg}')">
                                          </div>
                                          <div class="col-6">
                                              <label class="small text-muted mb-1 fw-medium">เสียเวลา</label>
                                              <input type="number" class="form-control form-control-sm text-end inp-inc-a in-ext3" data-name="เสียเวลา" data-orig="${parseFloat(r[22])||0}" value="${parseFloat(r[22])||0}" oninput="updateCalcA(this, '${safeBkg}')">
                                          </div>
                                      </div>
                                  </div>
                               </div>
                               
                               <div class="col-md-7">
                                  <div class="bg-white border rounded-4 p-3 shadow-sm h-100">
                                      <div class="d-flex justify-content-between mb-3">
                                          <span class="text-danger fw-bold"><i class="bi bi-arrow-down-right-circle me-1"></i>สำรองจ่าย (Advance)</span>
                                          <span class="text-danger fw-bold fs-6 row-adv-a">฿${obj.advTot.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
                                      </div>
                                      <div class="row g-2">
                                          <div class="col-4 col-sm-3">
                                              <label class="small text-muted mb-1 fw-medium">รับตู้</label>
                                              <input type="number" class="form-control form-control-sm text-end inp-adv-a in-adv1" data-name="รับตู้" data-orig="${parseFloat(r[18])||0}" value="${parseFloat(r[18])||0}" oninput="updateCalcA(this, '${safeBkg}')">
                                          </div>
                                          <div class="col-4 col-sm-3">
                                              <label class="small text-muted mb-1 fw-medium">คืนตู้</label>
                                              <input type="number" class="form-control form-control-sm text-end inp-adv-a in-adv2" data-name="คืนตู้" data-orig="${parseFloat(r[19])||0}" value="${parseFloat(r[19])||0}" oninput="updateCalcA(this, '${safeBkg}')">
                                          </div>
                                          <div class="col-4 col-sm-3">
                                              <label class="small text-muted mb-1 fw-medium">ผ่านท่า</label>
                                              <input type="number" class="form-control form-control-sm text-end inp-adv-a in-adv3" data-name="ผ่านท่า" data-orig="${parseFloat(r[24])||0}" value="${parseFloat(r[24])||0}" oninput="updateCalcA(this, '${safeBkg}')">
                                          </div>
                                          <div class="col-4 col-sm-3">
                                              <label class="small text-muted mb-1 fw-medium">ซ่อมตู้</label>
                                              <input type="number" class="form-control form-control-sm text-end inp-adv-a in-adv4" data-name="ซ่อมตู้" data-orig="${parseFloat(r[25])||0}" value="${parseFloat(r[25])||0}" oninput="updateCalcA(this, '${safeBkg}')">
                                          </div>
                                          <div class="col-4 col-sm-3">
                                              <label class="small text-muted mb-1 fw-medium">ล้างตู้</label>
                                              <input type="number" class="form-control form-control-sm text-end inp-adv-a in-adv5" data-name="ล้างตู้" data-orig="${parseFloat(r[26])||0}" value="${parseFloat(r[26])||0}" oninput="updateCalcA(this, '${safeBkg}')">
                                          </div>
                                          <div class="col-4 col-sm-3">
                                              <label class="small text-primary mb-1 fw-bold">ค่าชอ</label>
                                              <input type="number" class="form-control form-control-sm text-end border-primary bg-primary bg-opacity-10 inp-adv-a in-adv6" data-name="ค่าชอ" data-orig="${parseFloat(r[27])||0}" value="${parseFloat(r[27])||0}" oninput="updateCalcA(this, '${safeBkg}')">
                                          </div>
                                          
                                          <div class="col-6 col-sm-3">
                                              <label class="small text-muted mb-1 fw-medium">ชื่อยอดอื่น 1</label>
                                              <input type="text" class="form-control form-control-sm in-extn1" data-name="ชื่อยอดอื่น 1" data-orig="${r[28]||''}" value="${r[28]||''}" oninput="updateCalcA(this, '${safeBkg}')">
                                          </div>
                                          <div class="col-6 col-sm-3">
                                              <label class="small text-muted mb-1 fw-medium">ยอดเงิน 1</label>
                                              <input type="number" class="form-control form-control-sm text-end inp-adv-a in-extv1" data-name="ยอดเงิน 1" data-orig="${parseFloat(r[29])||0}" value="${parseFloat(r[29])||0}" oninput="updateCalcA(this, '${safeBkg}')">
                                          </div>
                                      </div>
                                  </div>
                               </div>
                               
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        });
    }
    
    document.getElementById('auditBody').innerHTML = html; 
    document.getElementById('checkAllA').checked = false; 
    calcSummaryA();
}

function updateCalcA(inputElem, safeBkg) {
    let origVal = inputElem.getAttribute('data-orig') || ''; 
    let currentVal = inputElem.value || '';
    
    if (inputElem.type === 'number') { 
        origVal = parseFloat(origVal) || 0; 
        currentVal = parseFloat(currentVal) || 0; 
    } else { 
        origVal = origVal.toString().trim(); 
        currentVal = currentVal.toString().trim(); 
    }
    
    if (origVal !== currentVal) { 
        inputElem.classList.add('bg-warning', 'bg-opacity-10', 'border-warning'); 
    } else { 
        inputElem.classList.remove('bg-warning', 'bg-opacity-10', 'border-warning'); 
    }
    
    let container = inputElem.closest('.item-container-a');
    
    let sumInc = 0; 
    container.querySelectorAll('.inp-inc-a').forEach(inp => sumInc += (parseFloat(inp.value) || 0));
    
    let sumAdv = 0; 
    container.querySelectorAll('.inp-adv-a').forEach(inp => sumAdv += (parseFloat(inp.value) || 0));
    
    let sumTot = sumInc + sumAdv;
    
    container.querySelector('.row-inc-a').innerText = '฿' + sumInc.toLocaleString(undefined, {minimumFractionDigits:2}); 
    container.querySelector('.row-adv-a').innerText = '฿' + sumAdv.toLocaleString(undefined, {minimumFractionDigits:2}); 
    container.querySelector('.row-tot-a').innerText = '฿' + sumTot.toLocaleString(undefined, {minimumFractionDigits:2});
    
    container.querySelector('.row-check-a').setAttribute('data-tot', sumTot);
    
    let tTot = 0; 
    document.querySelectorAll(`.check-a-${safeBkg}`).forEach(cb => tTot += parseFloat(cb.getAttribute('data-tot')));
    
    if(document.getElementById(`pa-tot-${safeBkg}`)) {
        document.getElementById(`pa-tot-${safeBkg}`).innerText = '฿' + tTot.toLocaleString(undefined, {minimumFractionDigits:2});
    }
}

function toggleDetailA(safeBkg) {
    let rows = document.querySelectorAll(`.detail-a-${safeBkg}`); 
    let icon = document.getElementById(`icon-a-${safeBkg}`); 
    
    if (rows.length === 0) return;
    
    let isHidden = rows[0].style.display === 'none'; 
    rows.forEach(r => r.style.display = isHidden ? 'table-row' : 'none');
    
    if(icon) {
        icon.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';
    }
}

function toggleBookingA(cb, safeBkg) { 
    document.querySelectorAll(`.check-a-${safeBkg}`).forEach(child => child.checked = cb.checked); 
    calcSummaryA(); 
}

function toggleAllAudit(source) { 
    document.querySelectorAll('.bkg-check-a, .row-check-a').forEach(cb => cb.checked = source.checked); 
    calcSummaryA(); 
}

function calcSummaryA() {
    let checkboxes = document.querySelectorAll('.row-check-a:checked'); 
    document.getElementById('selCountA').innerText = checkboxes.length;
    
    document.querySelectorAll('.bkg-check-a').forEach(bkgCb => {
        let safeBkg = bkgCb.getAttribute('data-safebkg'); 
        let tChild = document.querySelectorAll(`.check-a-${safeBkg}`).length; 
        let cChild = document.querySelectorAll(`.check-a-${safeBkg}:checked`).length;
        
        if(cChild === 0) { 
            bkgCb.checked = false; 
            bkgCb.indeterminate = false; 
        } else if(cChild === tChild) { 
            bkgCb.checked = true; 
            bkgCb.indeterminate = false; 
        } else { 
            bkgCb.checked = false; 
            bkgCb.indeterminate = true; 
        }
    });
}

async function saveAuditBulk() {
    let checkboxes = document.querySelectorAll('.row-check-a:checked'); 
    
    if(checkboxes.length === 0) {
        return Swal.fire({
            icon: 'warning', 
            title: 'ยังไม่ได้เลือกรายการ', 
            text: 'กรุณาเลือกตู้ที่ต้องการอนุมัติ', 
            customClass: {popup: 'rounded-4'}
        });
    }
    
    let payloadData = []; 
    
    checkboxes.forEach(cb => {
        let c = cb.closest('.item-container-a'); 
        let editLogs = [];
        
        c.querySelectorAll('.inp-inc-a, .inp-adv-a, .in-extn1, .in-extn2').forEach(inp => {
            let orig = inp.getAttribute('data-orig') || ''; 
            let curr = inp.value || '';
            
            if (inp.type === 'number') { 
                orig = parseFloat(orig)||0; 
                curr = parseFloat(curr)||0; 
            }
            
            if (orig !== curr) { 
                if (inp.type === 'number') {
                    editLogs.push(`${inp.getAttribute('data-name')} ${orig.toLocaleString()}->${curr.toLocaleString()}`); 
                } else {
                    editLogs.push(`${inp.getAttribute('data-name')} เปลี่ยนเป็น ${curr}`); 
                }
            }
        });
        
        payloadData.push({
            rowIdx: parseInt(cb.value), 
            price: parseFloat(c.querySelector('.in-p').value)||0, 
            adv1: parseFloat(c.querySelector('.in-adv1').value)||0,    
            adv2: parseFloat(c.querySelector('.in-adv2').value)||0, 
            ext1: parseFloat(c.querySelector('.in-ext1').value)||0, 
            ext2: parseFloat(c.querySelector('.in-ext2').value)||0,    
            ext3: parseFloat(c.querySelector('.in-ext3').value)||0, 
            adv3: parseFloat(c.querySelector('.in-adv3').value)||0, 
            adv4: parseFloat(c.querySelector('.in-adv4').value)||0,    
            adv5: parseFloat(c.querySelector('.in-adv5').value)||0, 
            adv6: parseFloat(c.querySelector('.in-adv6').value)||0, 
            extn1: c.querySelector('.in-extn1').value.trim(),          
            extv1: parseFloat(c.querySelector('.in-extv1').value)||0, 
            extn2: c.querySelector('.in-extn2') ? c.querySelector('.in-extn2').value.trim() : '', 
            extv2: 0,  
            log: editLogs.length > 0 ? `[บัญชีแก้: ${editLogs.join(', ')}]` : '' 
        });
    });

    Swal.fire({ 
        title: 'ยืนยันการอนุมัติ?', 
        text: `คุณกำลังส่ง ${payloadData.length} ตู้ไปยังหน้า "เตรียมวางบิล"`, 
        icon: 'question', 
        showCancelButton: true, 
        confirmButtonColor: '#4f46e5', 
        confirmButtonText: 'ยืนยัน', 
        cancelButtonText: 'ยกเลิก', 
        customClass: {popup: 'rounded-4'}
    }).then(async result => {
        if(result.isConfirmed) {
            Swal.fire({ 
                title: 'กำลังบันทึก...', 
                allowOutsideClick: false, 
                didOpen: () => Swal.showLoading(), 
                customClass: {popup: 'rounded-4'} 
            });
            
            try { 
                const res = await callAPI('saveAuditData', { payload: payloadData }); 
                if(res.success) { 
                    Swal.fire({
                        icon: 'success', 
                        title: 'สำเร็จ!', 
                        text: res.message, 
                        customClass: {popup: 'rounded-4'}
                    }); 
                    loadBillingData(); 
                } else { 
                    Swal.fire('เกิดข้อผิดพลาด', res.message, 'error'); 
                } 
            } catch(err) { 
                Swal.fire('เกิดข้อผิดพลาด', err.message, 'error'); 
            }
        }
    });
}

// ================= TAB 2 : Ready for Invoice =================
function applyFilterReady() {
    let fCust = document.getElementById('filterCustomerR') ? document.getElementById('filterCustomerR').value.toLowerCase() : ''; 
    let fText = document.getElementById('filterTextR') ? document.getElementById('filterTextR').value.toLowerCase() : '';
    
    filteredReady = readyData.filter(obj => {
        let r = obj.rowData; 
        let matchCust = fCust === '' || (r[4] && r[4].toString().toLowerCase() === fCust); 
        let matchText = fText === '' || 
                        (r[6]||'').toString().toLowerCase().includes(fText) || 
                        (r[23]||'').toString().toLowerCase().includes(fText) || 
                        (r[16]||'').toString().toLowerCase().includes(fText);
                        
        return matchCust && matchText;
    });
    
    renderReadyTab();
}

function clearFilterReady() { 
    if(document.getElementById('filterCustomerR')) document.getElementById('filterCustomerR').value = ''; 
    if(document.getElementById('filterTextR')) document.getElementById('filterTextR').value = ''; 
    applyFilterReady(); 
}

function renderReadyTab() {
    let html = '';
    
    if(filteredReady.length === 0) { 
        document.getElementById('readyBody').innerHTML = '<tr><td colspan="9" class="text-center py-5 text-muted"><i class="bi bi-inboxes fs-1 d-block mb-3 opacity-25"></i>กรุณาเลือกลูกค้า หรือไม่มีข้อมูลพร้อมวางบิล</td></tr>'; 
        document.getElementById('checkAllR').checked = false; 
        calcSummaryR(); 
        return; 
    }
    
    groupedReadyGlobal = {};
    filteredReady.forEach(obj => {
        let r = obj.rowData; 
        let bkg = r[6]; 
        
        if(!groupedReadyGlobal[bkg]) {
            groupedReadyGlobal[bkg] = { cs: r[1], customer: r[4], date: r[0], items: [], sumInc: 0, sumAdv: 0, sumTot: 0 };
        }
        
        groupedReadyGlobal[bkg].items.push(obj); 
        groupedReadyGlobal[bkg].sumInc += obj.incTot; 
        groupedReadyGlobal[bkg].sumAdv += obj.advTot; 
        groupedReadyGlobal[bkg].sumTot += obj.grandTot;
    });
    
    let bkgKeys = Object.keys(groupedReadyGlobal); 
    let limitVal = document.getElementById('limitR') ? document.getElementById('limitR').value : 'ALL';
    
    if (limitVal !== 'ALL') {
        bkgKeys = bkgKeys.slice(0, parseInt(limitVal));
    }

    for (let bkg of bkgKeys) {
        let group = groupedReadyGlobal[bkg]; 
        let dateStr = new Date(group.date).toLocaleDateString('en-GB'); 
        let totalInSystem = bkgTotalsGlobal[bkg] || group.items.length;
        let badgeClass = group.items.length < totalInSystem ? 'bg-warning bg-opacity-25 text-warning border border-warning' : 'bg-secondary bg-opacity-10 text-secondary';
        let safeBkg = 'bkg_' + bkg.replace(/[^a-zA-Z0-9]/g, '_');

        html += `
            <tr class="parent-row bg-white" onclick="toggleDetailR('${safeBkg}')">
                <td class="text-center align-middle" onclick="event.stopPropagation();">
                    <input type="checkbox" class="bkg-check-r form-check-input shadow-sm" value="${bkg}" data-safebkg="${safeBkg}" onchange="calcSummaryR()" style="width:1.2em; height:1.2em;">
                </td>
                <td>
                    <i class="bi bi-chevron-right ms-1 me-2 text-primary fw-bold" id="icon-r-${safeBkg}" style="font-size:0.8rem; transition:0.3s;"></i> ${dateStr}
                </td>
                <td class="fw-bold text-dark">${group.customer || '-'}</td>
                <td class="fw-bold text-primary">${bkg}</td>
                <td class="text-center">
                    <span class="badge ${badgeClass} rounded-pill px-3">${group.items.length} / ${totalInSystem}</span>
                </td>
                <td class="text-end text-success fw-medium">฿${group.sumInc.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                <td class="text-end text-danger fw-medium">฿${group.sumAdv.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                <td class="text-end text-primary fw-bold pe-3 fs-6">฿${group.sumTot.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                <td class="text-center" onclick="event.stopPropagation();">
                    <button class="btn btn-white text-warning btn-sm fw-bold border rounded-pill shadow-sm" onclick="revertBooking('${bkg}')" title="ส่งกลับหน้าตรวจสอบ">
                        <i class="bi bi-arrow-counterclockwise"></i>
                    </button>
                </td>
            </tr>
        `;

        let childRows = '';
        group.items.forEach(obj => {
            let r = obj.rowData; 
            childRows += `
                <tr class="border-bottom border-light">
                    <td class="text-primary fw-semibold">${r[23]||'-'}</td>
                    <td class="text-secondary"><i class="bi bi-truck me-1"></i>${r[16]||'-'}</td>
                    <td class="text-end text-success">฿${obj.incTot.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                    <td class="text-end text-danger">฿${obj.advTot.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                    <td class="text-end fw-bold">฿${obj.grandTot.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                </tr>
            `;
        });
        
        html += `
            <tr class="detail-row detail-r-${safeBkg}" style="display: none; background: transparent;">
                <td></td>
                <td colspan="8" class="p-0">
                    <div class="bg-white m-2 p-3 rounded-4 shadow-sm border">
                        <table class="table table-borderless table-sm m-0" style="font-size: 13px;">
                            <thead class="text-muted border-bottom">
                                <tr>
                                    <th>ตู้คอนเทนเนอร์</th>
                                    <th>ทะเบียนรถ</th>
                                    <th class="text-end">รายได้</th>
                                    <th class="text-end">สำรองจ่าย</th>
                                    <th class="text-end">สุทธิ</th>
                                </tr>
                            </thead>
                            <tbody>${childRows}</tbody>
                        </table>
                    </div>
                </td>
            </tr>
        `;
    }
    
    document.getElementById('readyBody').innerHTML = html; 
    document.getElementById('checkAllR').checked = false; 
    calcSummaryR();
}

function toggleDetailR(safeBkg) {
    let rows = document.querySelectorAll(`.detail-r-${safeBkg}`); 
    let icon = document.getElementById(`icon-r-${safeBkg}`); 
    
    if (rows.length === 0) return; 
    
    let isHidden = rows[0].style.display === 'none';
    rows.forEach(r => r.style.display = isHidden ? 'table-row' : 'none'); 
    
    if(icon) {
        icon.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';
    }
}

function toggleAllReady(source) { 
    document.querySelectorAll('.bkg-check-r').forEach(cb => cb.checked = source.checked); 
    calcSummaryR(); 
}

function calcSummaryR() {
    let sInc = 0, sAdv = 0, sTot = 0, countBkg = 0, countCont = 0; 
    
    document.querySelectorAll('.bkg-check-r:checked').forEach(cb => { 
        let group = groupedReadyGlobal[cb.value]; 
        if(group) { 
            sInc += group.sumInc; 
            sAdv += group.sumAdv; 
            sTot += group.sumTot; 
            countBkg++; 
            countCont += group.items.length; 
        } 
    });
    
    document.getElementById('selCountR').innerText = countBkg; 
    if (document.getElementById('selCountContR')) {
        document.getElementById('selCountContR').innerText = countCont;
    }
    
    document.getElementById('sumIncomeR').innerText = sInc.toLocaleString(undefined, {minimumFractionDigits:2}); 
    document.getElementById('sumAdvanceR').innerText = sAdv.toLocaleString(undefined, {minimumFractionDigits:2}); 
    document.getElementById('sumGrandR').innerText = sTot.toLocaleString(undefined, {minimumFractionDigits:2});
}

function revertBooking(bkg) {
    Swal.fire({ 
        title: 'ส่งกลับหน้าตรวจสอบ?', 
        html: `ต้องการส่ง Booking: <b class="text-warning">${bkg}</b> กลับไปหน้าตรวจสอบยอดใหม่หรือไม่`, 
        icon: 'warning', 
        showCancelButton: true, 
        confirmButtonColor: '#f59e0b', 
        confirmButtonText: 'ยืนยัน', 
        cancelButtonText: 'ยกเลิก', 
        customClass: {popup: 'rounded-4'}
    }).then(async res => {
        if(res.isConfirmed) {
            Swal.fire({ 
                title: 'กำลังดำเนินการ...', 
                allowOutsideClick: false, 
                didOpen: () => Swal.showLoading(), 
                customClass: {popup: 'rounded-4'} 
            });
            
            try { 
                const r = await callAPI('revertToAudit', { bookingNo: bkg }); 
                if(r.success) { 
                    Swal.fire({
                        icon: 'success', 
                        title: 'สำเร็จ', 
                        text: r.message, 
                        customClass: {popup: 'rounded-4'}
                    }); 
                    loadBillingData(); 
                } else { 
                    Swal.fire('เกิดข้อผิดพลาด', r.message, 'error'); 
                } 
            } catch(err) { 
                Swal.fire('เกิดข้อผิดพลาด', err.message, 'error'); 
            }
        }
    });
}

let tempPayloadForPDF = []; 

async function generateInvoiceBulk() {
    let checkboxes = document.querySelectorAll('.bkg-check-r:checked'); 
    
    if(checkboxes.length === 0) {
        return Swal.fire({
            icon: 'warning', 
            title: 'ยังไม่ได้เลือกรายการ', 
            text: 'กรุณาเลือก Booking เพื่อออก Invoice', 
            customClass: {popup: 'rounded-4'}
        });
    }
    
    let custSet = new Set(); 
    tempPayloadForPDF = []; 
    let sumTotal = 0;
    
    checkboxes.forEach(cb => {
        let group = groupedReadyGlobal[cb.value];
        if(group) {
            group.items.forEach(obj => {
                let r = obj.rowData; 
                let billToName = r[34] || r[4]; 
                custSet.add(billToName); 
                
                tempPayloadForPDF.push({
                   rowIdx: obj.rowIdx, 
                   jobCustomer: r[4], 
                   customer: billToName, 
                   booking: r[6], 
                   date: r[0], 
                   plate: r[16] || '-', 
                   cy: r[7] || '-', 
                   load: r[5] || '-', 
                   rtn: r[10] || '-', 
                   type: r[2] || '-', 
                   container: r[23] || '-', 
                   remark: r[14] || '',    
                   price: parseFloat(r[17]) || 0, 
                   adv1: parseFloat(r[18]) || 0, 
                   adv2: parseFloat(r[19]) || 0, 
                   adv6: parseFloat(r[24]) || 0, 
                   ext1: parseFloat(r[20]) || 0, 
                   ext2: parseFloat(r[21]) || 0, 
                   ext3: parseFloat(r[22]) || 0, 
                   adv4: parseFloat(r[25]) || 0, 
                   adv5: parseFloat(r[26]) || 0, 
                   adv9: parseFloat(r[27]) || 0, 
                   incTotal: obj.incTot, 
                   advTotal: obj.advTot, 
                   grandTotal: obj.grandTot
                }); 
                
                sumTotal += obj.grandTot;
            });
        }
    });

    if(custSet.size > 1) { 
        return Swal.fire({
            icon: 'error', 
            title: 'ไม่สามารถรวมบิลได้', 
            text: 'ต้องเลือกลูกค้า (Bill To) เจ้าเดียวกันเพื่อรวมบิล 1 ใบ', 
            customClass: {popup: 'rounded-4'}
        }); 
    }
    
    let rawCustomerName = Array.from(custSet)[0];
    
    Swal.fire({ 
        title: 'กำลังโหลดข้อมูล...', 
        allowOutsideClick: false, 
        didOpen: () => Swal.showLoading(), 
        customClass: {popup: 'rounded-4'} 
    });

    try {
        const res = await callAPI('getFullCustomerNameForPopup', { searchName: rawCustomerName }); 
        Swal.close();
        
        let finalNameToShow = res.officialName ? res.officialName : rawCustomerName;
        document.getElementById('modBillToName').value = finalNameToShow; 
        document.getElementById('modCount').innerText = tempPayloadForPDF.length;
        document.getElementById('modTotal').innerText = '฿' + sumTotal.toLocaleString(undefined, {minimumFractionDigits:2});
        
        let today = new Date(); 
        document.getElementById('modInvoiceDate').value = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, '0') + "-" + String(today.getDate()).padStart(2, '0');
        
        document.getElementById('modSplitInvoice').checked = false; 
        document.getElementById('modCustomInvNo').value = ''; 
        
        new bootstrap.Modal(document.getElementById('invoiceSettingModal')).show();
    } catch(err) {
        Swal.close(); 
        document.getElementById('modBillToName').value = rawCustomerName; 
        document.getElementById('modCustomInvNo').value = ''; 
        new bootstrap.Modal(document.getElementById('invoiceSettingModal')).show();
    }
}

async function confirmGeneratePDF() {
    let invDate = document.getElementById('modInvoiceDate').value; 
    let finalBillTo = document.getElementById('modBillToName').value.trim();
    let isSplit = document.getElementById('modSplitInvoice').checked; 
    let customInvNo = document.getElementById('modCustomInvNo').value.trim(); 
    
    if(!invDate || !finalBillTo) {
        return Swal.fire({
            icon: 'warning', 
            text: 'กรุณาระบุวันที่และชื่อลูกค้า', 
            customClass: {popup: 'rounded-4'}
        });
    }
    
    tempPayloadForPDF.forEach(item => { item.customer = finalBillTo; });
    
    document.getElementById('loadingGenPDF').style.display = 'block'; 
    document.getElementById('btnConfirmGen').disabled = true;

    try {
        const res = await callAPI('generateInvoicePDF', { 
            payload: tempPayloadForPDF, 
            invoiceDate: invDate, 
            billingUser: currentUser, 
            isSplit: isSplit, 
            customInvNo: customInvNo 
        });
        
        document.getElementById('loadingGenPDF').style.display = 'none'; 
        document.getElementById('btnConfirmGen').disabled = false;
        
        if(res.success) {
            bootstrap.Modal.getInstance(document.getElementById('invoiceSettingModal')).hide();
            
            let htmlContent = '';
            if (res.pdfUrls && res.pdfUrls.length > 1) {
                htmlContent = `
                    <p class="text-muted">บิลแยกประเภทพร้อมแล้ว</p>
                    <div class="d-flex flex-column gap-3 mt-3 px-2">
                        <a href="${res.pdfUrls[0]}" target="_blank" class="btn btn-primary rounded-pill fw-bold shadow-sm py-2">บิลค่าขนส่ง</a>
                        <a href="${res.pdfUrls[1]}" target="_blank" class="btn btn-light text-primary border-primary rounded-pill fw-bold shadow-sm py-2">บิลสำรองจ่าย</a>
                    </div>
                `;
            } else {
                htmlContent = `
                    <p class="text-muted">เอกสารพร้อมใช้งาน</p>
                    <a href="${res.pdfUrl}" target="_blank" class="btn btn-primary btn-lg rounded-pill mt-2 px-5 fw-bold shadow-sm" onclick="Swal.close()">
                        <i class="bi bi-file-earmark-pdf-fill me-2"></i> เปิดดู Invoice
                    </a>
                `;
            }
            
            Swal.fire({ 
                icon: 'success', 
                title: 'สร้าง Invoice สำเร็จ!', 
                html: htmlContent, 
                showConfirmButton: false, 
                showCloseButton: true, 
                customClass: {popup: 'rounded-4'}, 
                didClose: () => { 
                    document.getElementById('tab-history').click(); 
                    loadBillingData(); 
                } 
            });
        } else { 
            Swal.fire({
                icon: 'error', 
                title: 'เกิดข้อผิดพลาด', 
                text: res.message, 
                customClass: {popup: 'rounded-4'}
            }); 
        }
    } catch(err) {
        document.getElementById('loadingGenPDF').style.display = 'none'; 
        document.getElementById('btnConfirmGen').disabled = false; 
        Swal.fire('เกิดข้อผิดพลาด', err.message, 'error');
    }
}

// ================= TAB 3 : History & Edit =================
async function loadHistory() {
    document.getElementById('historyBody').innerHTML = '<tr><td colspan="7" class="text-center py-5 text-primary"><div class="spinner-border spinner-border-sm me-2"></div>กำลังโหลดประวัติ...</td></tr>';
    
    try {
        const data = await callAPI('getBilledHistory');
        
        if(data && data.error) { 
            document.getElementById('historyBody').innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">${data.error}</td></tr>`; 
            return; 
        }
        
        rawHistoryData = data;
        
        let customers = [...new Set(data.map(r => r.customer).filter(v => v))]; 
        let ddlCust = '<option value="">- ลูกค้าทั้งหมด -</option>'; 
        customers.forEach(c => ddlCust += `<option value="${c}">${c}</option>`); 
        
        if(document.getElementById('hFilterCustomer')) {
            document.getElementById('hFilterCustomer').innerHTML = ddlCust;
        }
        
        let csList = [...new Set(data.map(r => r.cs).filter(v => v && v !== '-'))]; 
        let ddlCS = '<option value="">- CS ทั้งหมด -</option>'; 
        csList.forEach(c => ddlCS += `<option value="${c}">${c}</option>`); 
        
        if(document.getElementById('hFilterCS')) {
            document.getElementById('hFilterCS').innerHTML = ddlCS;
        }
        
        applyHistoryFilter(); 
        
    } catch(err) { 
        document.getElementById('historyBody').innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">${err.message}</td></tr>`; 
    }
}

function clearHistoryFilters() { 
    if(document.getElementById('hFilterText')) document.getElementById('hFilterText').value = ''; 
    if(document.getElementById('hFilterCS')) document.getElementById('hFilterCS').value = ''; 
    if(document.getElementById('hFilterCustomer')) document.getElementById('hFilterCustomer').value = ''; 
    if(document.getElementById('hFilterYear')) document.getElementById('hFilterYear').value = ''; 
    if(document.getElementById('hFilterMonth')) document.getElementById('hFilterMonth').value = ''; 
    
    applyHistoryFilter(); 
}

function applyHistoryFilter() {
    let fText = document.getElementById('hFilterText') ? document.getElementById('hFilterText').value.toLowerCase() : '';
    let fCS = document.getElementById('hFilterCS') ? document.getElementById('hFilterCS').value.toLowerCase() : '';
    let fCust = document.getElementById('hFilterCustomer') ? document.getElementById('hFilterCustomer').value.toLowerCase() : '';
    let fYear = document.getElementById('hFilterYear') ? document.getElementById('hFilterYear').value : '';
    let fMonth = document.getElementById('hFilterMonth') ? document.getElementById('hFilterMonth').value : '';
    
    filteredHistoryData = rawHistoryData.filter(r => {
        let d = new Date(r.date); 
        let validDate = !isNaN(d.getTime());
        
        let matchText = fText === '' || r.invoiceNo.toLowerCase().includes(fText); 
        let matchCS = fCS === '' || (r.cs && r.cs.toLowerCase().includes(fCS)); 
        let matchCust = fCust === '' || (r.customer && r.customer.toLowerCase().includes(fCust));
        
        let mYear = fYear === '' || (validDate && d.getFullYear().toString() === fYear); 
        let mMonth = fMonth === '' || (validDate && (d.getMonth() + 1).toString().padStart(2, '0') === fMonth);
        
        return matchText && matchCS && matchCust && mYear && mMonth;
    });
    
    sortHistory(histSortCol, true); 
}

function sortHistory(col, keepDirection = false) {
    if(!keepDirection) { 
        if(histSortCol === col) {
            histSortAsc = !histSortAsc; 
        } else { 
            histSortCol = col; 
            histSortAsc = true; 
        } 
    }
    
    filteredHistoryData.sort((a, b) => {
        let valA = a[col]; 
        let valB = b[col];
        
        if(col === 'date') { 
            valA = new Date(valA).getTime(); 
            valB = new Date(valB).getTime(); 
        } else if (typeof valA === 'string') { 
            valA = valA.toLowerCase(); 
            valB = valB.toLowerCase(); 
        }
        
        if(valA < valB) return histSortAsc ? -1 : 1; 
        if(valA > valB) return histSortAsc ? 1 : -1; 
        return 0;
    });
    
    renderHistoryTable();
}

function renderHistoryTable() {
    let html = '';
    
    if(filteredHistoryData.length === 0) { 
        html = '<tr><td colspan="7" class="text-center text-muted py-5"><i class="bi bi-files fs-1 d-block mb-3 opacity-25"></i> ไม่พบประวัติเอกสาร</td></tr>'; 
    } else {
        let limitElem = document.getElementById('limitH'); 
        let limitVal = limitElem ? limitElem.value : 'ALL'; 
        let dataToRender = filteredHistoryData;
        
        if (limitVal !== 'ALL') {
            dataToRender = filteredHistoryData.slice(0, parseInt(limitVal)); 
        }

        dataToRender.forEach((r) => {
            let dateStr = new Date(r.date).toLocaleDateString('en-GB');
            let isOwnerOrAdmin = (currentUser.toString().trim().toLowerCase() === r.billingUser.toString().trim().toLowerCase() || currentUser === 'Admin');
            
            let docStatusStr = ''; 
            let menuItems = '';

            menuItems += `<li><h6 class="dropdown-header"><i class="bi bi-eye"></i> ดูเอกสาร</h6></li>`;
            menuItems += `<li><button class="dropdown-item text-primary" type="button" onclick="printPDF('${r.invoiceNo}')"><i class="bi bi-file-earmark-text me-2"></i>ใบแจ้งหนี้ (Invoice)</button></li>`;
            
            if (r.receiptNo) { 
                docStatusStr += '<span class="badge bg-success bg-opacity-10 text-success border border-success mt-1 me-1">ใบเสร็จ</span>'; 
                menuItems += `<li><button class="dropdown-item text-success" type="button" onclick="printPDF('${r.receiptNo}')"><i class="bi bi-receipt me-2"></i>ใบเสร็จรับเงิน (Receipt)</button></li>`; 
            }
            
            if (r.voucherNo) { 
                docStatusStr += '<span class="badge bg-info bg-opacity-10 text-info border border-info mt-1">ใบสำคัญ</span>'; 
                menuItems += `<li><button class="dropdown-item text-info" type="button" onclick="printPDF('${r.voucherNo}')"><i class="bi bi-cash-coin me-2"></i>ใบสำคัญรับ (Voucher)</button></li>`; 
            }
            
            if (!r.receiptNo || !r.voucherNo) {
                menuItems += `<li><hr class="dropdown-divider"></li>`;
                if (!r.receiptNo) {
                    menuItems += `<li><button class="dropdown-item text-success" type="button" onclick="openReceiptModal('${r.invoiceNo}', 'RECEIPT')"><i class="bi bi-plus-circle me-2"></i>สร้างใบเสร็จรับเงิน</button></li>`;
                }
                if (!r.voucherNo) {
                    menuItems += `<li><button class="dropdown-item text-info" type="button" onclick="openReceiptModal('${r.invoiceNo}', 'VOUCHER')"><i class="bi bi-plus-circle me-2"></i>สร้างใบสำคัญรับ</button></li>`;
                }
            }
            
            menuItems += `<li><hr class="dropdown-divider"></li>`;
            
            if (isOwnerOrAdmin) {
                if (r.receiptNo) {
                    menuItems += `<li><button class="dropdown-item text-danger" type="button" onclick="promptRollbackReceipt('${r.invoiceNo}', '${r.receiptNo}', 'REC')"><i class="bi bi-trash me-2"></i>ลบใบเสร็จรับเงิน</button></li>`;
                }
                if (r.voucherNo) {
                    menuItems += `<li><button class="dropdown-item text-danger" type="button" onclick="promptRollbackReceipt('${r.invoiceNo}', '${r.voucherNo}', 'VOU')"><i class="bi bi-trash me-2"></i>ลบใบสำคัญรับ</button></li>`;
                }
                
                if (!r.receiptNo && !r.voucherNo) {
                    menuItems += `<li><button class="dropdown-item text-dark fw-bold" type="button" onclick="openEditInvoiceModal('${r.invoiceNo}')"><i class="bi bi-pencil-square me-2"></i>แก้ไขบิลโดยตรง</button></li>`;
                    menuItems += `<li><button class="dropdown-item text-danger" type="button" onclick="promptRollback('${r.invoiceNo}')"><i class="bi bi-arrow-counterclockwise me-2"></i>ยกเลิกบิล</button></li>`;
                } else {
                    menuItems += `<li><button class="dropdown-item text-muted" type="button" onclick="Swal.fire({icon:'warning', text:'กรุณาลบใบเสร็จ/ใบสำคัญรับ ทิ้งก่อน จึงจะแก้ไขบิลได้', customClass:{popup:'rounded-4'}})"> <i class="bi bi-pencil-square me-2"></i>แก้ไขบิลโดยตรง </button></li>`;
                    menuItems += `<li><button class="dropdown-item text-muted" type="button" onclick="Swal.fire({icon:'warning', text:'กรุณาลบใบเสร็จ/ใบสำคัญรับ ทิ้งก่อน จึงจะยกเลิกบิลได้', customClass:{popup:'rounded-4'}})"> <i class="bi bi-arrow-counterclockwise me-2"></i>ยกเลิกบิล </button></li>`;
                }
            } else { 
                menuItems += `<li><button class="dropdown-item text-muted" type="button" disabled><i class="bi bi-lock-fill me-2"></i>ถูกล็อค (เฉพาะเจ้าของบิล)</button></li>`; 
            }

            let displayStatusBadge = docStatusStr ? `<br><div class="mt-1">${docStatusStr}</div>` : '';
            let quickViewLink = `<a href="javascript:void(0);" onclick="viewInvoiceDetails('${r.invoiceNo}')" class="text-primary fw-bold text-decoration-none"><i class="bi bi-info-circle-fill me-1 opacity-50"></i>${r.invoiceNo}</a>`;

            html += `
                <tr>
                    <td class="px-3">${quickViewLink}${displayStatusBadge}</td>
                    <td class="text-muted fw-medium">${dateStr}</td>
                    <td class="text-secondary fw-medium">${r.cs}</td>
                    <td class="fw-bold text-dark">${r.customer}</td>
                    <td class="text-center">
                        <span class="badge bg-light text-dark border rounded-pill px-3 shadow-sm">${r.count}</span>
                    </td>
                    <td class="text-end fw-bold text-primary fs-6">฿${r.totalAmount.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                    <td class="text-center pe-4">
                        <div class="btn-group dropstart">
                            <button type="button" class="btn btn-white border shadow-sm btn-sm fw-bold dropdown-toggle dropdown-toggle-split rounded-pill px-3 text-secondary" data-bs-toggle="dropdown" aria-expanded="false">
                                <span class="visually-hidden">เปิดเมนู</span>
                                <i class="bi bi-three-dots"></i>
                            </button>
                            <ul class="dropdown-menu shadow-lg border-0">${menuItems}</ul>
                        </div>
                    </td>
                </tr>
            `;
        });
    }
    
    document.getElementById('historyBody').innerHTML = html;
}

async function viewInvoiceDetails(invNo) {
    Swal.fire({ 
        title: 'กำลังโหลดรายละเอียด...', 
        allowOutsideClick: false, 
        didOpen: () => Swal.showLoading(), 
        customClass:{popup:'rounded-4'} 
    });
    
    try {
        const res = await callAPI('getInvoiceDetails', { invoiceNo: invNo });
        
        if (res && res.error) {
            return Swal.fire('เกิดข้อผิดพลาด', res.error, 'error');
        }
        
        let html = `
            <div class="bg-white border rounded-4 overflow-hidden mt-3 shadow-sm">
                <table class="table table-borderless table-hover text-nowrap m-0" style="font-size: 0.82rem;">
                    <thead class="bg-light text-muted border-bottom">
                        <tr>
                            <th class="py-3 px-3">ตู้คอนเทนเนอร์</th>
                            <th>ทะเบียนรถ</th>
                            <th class="text-end">รายได้</th>
                            <th class="text-end">สำรองจ่าย</th>
                            <th class="text-end pe-3">รวมสุทธิ</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        res.forEach(r => { 
            html += `
                <tr>
                    <td class="text-start fw-bold text-primary py-3 px-3">${r.container}</td>
                    <td class="text-start text-secondary">${r.plate}</td>
                    <td class="text-end text-success fw-medium">฿${r.income.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                    <td class="text-end text-danger fw-medium">฿${r.advance.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                    <td class="text-end fw-bold text-dark pe-3">฿${r.total.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                </tr>
            `; 
        });
        
        html += `</tbody></table></div>`;
        
        Swal.fire({ 
            title: `<span class="fw-bold fs-4 text-dark">${invNo}</span>`, 
            html: `<div class="table-responsive" style="max-height: 400px; padding:0;">${html}</div>`, 
            width: '650px', 
            showCloseButton: true, 
            showConfirmButton: false, 
            customClass:{popup:'rounded-4', title:'mb-0'} 
        });
        
    } catch(err) { 
        Swal.fire('เกิดข้อผิดพลาด', err.message, 'error'); 
    }
}

async function openEditInvoiceModal(invoiceNo) {
    Swal.fire({ 
        title: 'กำลังโหลดข้อมูล...', 
        allowOutsideClick: false, 
        didOpen: () => Swal.showLoading(), 
        customClass:{popup:'rounded-4'} 
    });
    
    try {
        const res = await callAPI('getInvoiceForEdit', { invoiceNoStr: invoiceNo });
        
        if(!res.success) {
            return Swal.fire('เกิดข้อผิดพลาด', res.message, 'error');
        }
        
        document.getElementById('editInvNo').value = res.invoiceNo;
        
        let dStr = ""; 
        if(res.invoiceDate) { 
            let d = new Date(res.invoiceDate); 
            if(!isNaN(d)) {
                dStr = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,'0') + "-" + String(d.getDate()).padStart(2,'0'); 
            }
        }
        
        document.getElementById('editInvDate').value = dStr; 
        document.getElementById('editCustomer').value = res.customerName; 
        document.getElementById('editIsSplit').checked = res.isSplit;
        
        let html = '';
        res.items.forEach((itm, idx) => {
            html += `
                <div class="card shadow-sm border border-light mb-3 edit-item-card rounded-3 overflow-hidden" data-booking="${itm.booking}" data-container="${itm.container}">
                    <div class="card-header bg-white border-bottom pt-2 pb-1">
                        <h6 class="fw-bold text-dark mb-0 fs-6">
                            <i class="bi bi-box-seam me-2 text-primary"></i>${itm.container} 
                            <span class="badge bg-light text-secondary border fw-medium ms-2">BKG: ${itm.booking}</span>
                        </h6>
                    </div>
                    <div class="card-body bg-light p-2 px-3">
                        <div class="row g-3">
                            <div class="col-md-6 border-end border-light">
                                <p class="text-success fw-bold small mb-2"><i class="bi bi-arrow-up-right-circle me-1"></i>รายได้ (Income)</p>
                                <div class="row g-2">
                                    <div class="col-6">
                                        <label class="small text-muted mb-0" style="font-size: 0.75rem;">ราคาเที่ยว</label>
                                        <input type="number" class="form-control form-control-sm bg-white e-price" value="${itm.price}">
                                    </div>
                                    <div class="col-6">
                                        <label class="small text-muted mb-0" style="font-size: 0.75rem;">ต่อระยะ</label>
                                        <input type="number" class="form-control form-control-sm bg-white e-ext1" value="${itm.ext1}">
                                    </div>
                                    <div class="col-6">
                                        <label class="small text-muted mb-0" style="font-size: 0.75rem;">ค้างหาง</label>
                                        <input type="number" class="form-control form-control-sm bg-white e-ext2" value="${itm.ext2}">
                                    </div>
                                    <div class="col-6">
                                        <label class="small text-muted mb-0" style="font-size: 0.75rem;">เสียเวลา</label>
                                        <input type="number" class="form-control form-control-sm bg-white e-ext3" value="${itm.ext3}">
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <p class="text-danger fw-bold small mb-2"><i class="bi bi-arrow-down-right-circle me-1"></i>สำรองจ่าย (Advance)</p>
                                <div class="row g-2">
                                    <div class="col-4">
                                        <label class="small text-muted mb-0" style="font-size: 0.75rem;">รับตู้</label>
                                        <input type="number" class="form-control form-control-sm bg-white e-adv1" value="${itm.adv1}">
                                    </div>
                                    <div class="col-4">
                                        <label class="small text-muted mb-0" style="font-size: 0.75rem;">คืนตู้</label>
                                        <input type="number" class="form-control form-control-sm bg-white e-adv2" value="${itm.adv2}">
                                    </div>
                                    <div class="col-4">
                                        <label class="small text-muted mb-0" style="font-size: 0.75rem;">ผ่านท่า</label>
                                        <input type="number" class="form-control form-control-sm bg-white e-adv3" value="${itm.adv3}">
                                    </div>
                                    <div class="col-4">
                                        <label class="small text-muted mb-0" style="font-size: 0.75rem;">ซ่อมตู้</label>
                                        <input type="number" class="form-control form-control-sm bg-white e-adv4" value="${itm.adv4}">
                                    </div>
                                    <div class="col-4">
                                        <label class="small text-muted mb-0" style="font-size: 0.75rem;">ล้างตู้</label>
                                        <input type="number" class="form-control form-control-sm bg-white e-adv5" value="${itm.adv5}">
                                    </div>
                                    <div class="col-4">
                                        <label class="small text-primary fw-bold mb-0" style="font-size: 0.75rem;">ค่าชอ</label>
                                        <input type="number" class="form-control form-control-sm border-primary bg-primary bg-opacity-10 e-adv6" value="${itm.adv6}">
                                    </div>
                                    
                                    <div class="col-12 m-0 mt-1"><hr class="m-0 opacity-25"></div>
                                    
                                    <div class="col-8 mt-1">
                                        <label class="small text-muted mb-0" style="font-size: 0.75rem;">ยอดอื่น 1 (ชื่อ)</label>
                                        <input type="text" class="form-control form-control-sm bg-white e-extn1" value="${itm.extn1}">
                                    </div>
                                    <div class="col-4 mt-1">
                                        <label class="small text-muted mb-0" style="font-size: 0.75rem;">ยอด</label>
                                        <input type="number" class="form-control form-control-sm bg-white e-extv1" value="${itm.extv1}">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        document.getElementById('editItemsContainer').innerHTML = html; 
        Swal.close(); 
        new bootstrap.Modal(document.getElementById('editInvoiceModal')).show();
        
    } catch(err) { 
        Swal.fire('เกิดข้อผิดพลาด', err.message, 'error'); 
    }
}

function confirmEditInvoice() {
    let invNo = document.getElementById('editInvNo').value; 
    let invDate = document.getElementById('editInvDate').value; 
    let customer = document.getElementById('editCustomer').value.trim(); 
    let isSplit = document.getElementById('editIsSplit').checked;
    
    if(!invDate || !customer) {
        return Swal.fire({ 
            icon: 'warning', 
            text: 'กรุณาระบุวันที่และชื่อลูกค้า', 
            customClass: {popup: 'rounded-4'} 
        });
    }
    
    let updatedItems = [];
    document.querySelectorAll('.edit-item-card').forEach(card => {
        updatedItems.push({
            booking: card.getAttribute('data-booking'), 
            container: card.getAttribute('data-container'), 
            price: parseFloat(card.querySelector('.e-price').value)||0, 
            ext1: parseFloat(card.querySelector('.e-ext1').value)||0, 
            ext2: parseFloat(card.querySelector('.e-ext2').value)||0, 
            ext3: parseFloat(card.querySelector('.e-ext3').value)||0,
            adv1: parseFloat(card.querySelector('.e-adv1').value)||0, 
            adv2: parseFloat(card.querySelector('.e-adv2').value)||0, 
            adv3: parseFloat(card.querySelector('.e-adv3').value)||0, 
            adv4: parseFloat(card.querySelector('.e-adv4').value)||0, 
            adv5: parseFloat(card.querySelector('.e-adv5').value)||0, 
            adv6: parseFloat(card.querySelector('.e-adv6').value)||0,
            extn1: card.querySelector('.e-extn1').value.trim(), 
            extv1: parseFloat(card.querySelector('.e-extv1').value)||0, 
            extn2: card.querySelector('.e-extn2') ? card.querySelector('.e-extn2').value.trim() : '', 
            extv2: 0
        });
    });

    Swal.fire({ 
        title: 'ยืนยันการอัปเดต?', 
        text: "สร้าง PDF ใบใหม่ทับของเดิม", 
        icon: 'warning', 
        showCancelButton: true, 
        confirmButtonColor: '#1e293b', 
        confirmButtonText: 'ยืนยันอัปเดต', 
        cancelButtonText: 'ยกเลิก', 
        customClass:{popup:'rounded-4'}
    }).then(async (result) => {
        if (result.isConfirmed) {
            Swal.fire({ 
                title: 'กำลังอัปเดต...', 
                text: 'กรุณารอสักครู่...', 
                allowOutsideClick: false, 
                didOpen: () => Swal.showLoading(), 
                customClass:{popup:'rounded-4'} 
            });
            
            try {
                const res = await callAPI('saveEditedInvoice', { 
                    invoiceNoStr: invNo, 
                    invoiceDate: invDate, 
                    customerName: customer, 
                    isSplit: isSplit, 
                    items: updatedItems, 
                    billingUser: currentUser 
                });
                
                if(res.success) {
                    bootstrap.Modal.getInstance(document.getElementById('editInvoiceModal')).hide();
                    
                    let htmlContent = '';
                    if (res.pdfUrls && res.pdfUrls.length > 1) {
                        htmlContent = `
                            <p class="text-muted">เอกสารใหม่พร้อมแล้ว</p>
                            <div class="d-flex flex-column gap-3 mt-3">
                                <a href="${res.pdfUrls[0]}" target="_blank" class="btn btn-primary rounded-pill fw-bold">บิลค่าขนส่ง</a>
                                <a href="${res.pdfUrls[1]}" target="_blank" class="btn btn-light text-primary border-primary rounded-pill fw-bold">บิลสำรองจ่าย</a>
                            </div>
                        `;
                    } else {
                        htmlContent = `
                            <p class="text-muted">อัปเดตเอกสารเรียบร้อยแล้ว</p>
                            <a href="${res.pdfUrl}" target="_blank" class="btn btn-dark btn-lg rounded-pill mt-3 px-5 fw-bold shadow-sm" onclick="Swal.close()">
                                <i class="bi bi-file-earmark-pdf me-2"></i> เปิดดูเอกสารที่อัปเดต
                            </a>
                        `;
                    }
                    
                    Swal.fire({ 
                        icon: 'success', 
                        title: 'อัปเดตสำเร็จ!', 
                        html: htmlContent, 
                        showConfirmButton: false, 
                        showCloseButton: true, 
                        customClass:{popup:'rounded-4'}, 
                        didClose: () => { loadBillingData(); } 
                    });
                } else { 
                    Swal.fire({ 
                        icon: 'error', 
                        text: res.message, 
                        customClass:{popup:'rounded-4'} 
                    }); 
                }
            } catch(err) { 
                Swal.fire('เกิดข้อผิดพลาด', err.message, 'error'); 
            }
        }
    });
}

function promptRollback(invoiceNo) {
   Swal.fire({ 
       title: 'ยกเลิกบิล (Rollback)?', 
       html: `ต้องการยกเลิก Invoice <b class="text-danger">${invoiceNo}</b> และส่งกลับไปหน้าเตรียมวางบิลหรือไม่`, 
       icon: 'warning', 
       showCancelButton: true, 
       confirmButtonColor: '#ef4444', 
       confirmButtonText: 'ยืนยันยกเลิกบิล', 
       cancelButtonText: 'ปิด', 
       customClass:{popup:'rounded-4'}
   }).then(async res => {
      if(res.isConfirmed) {
         Swal.fire({ 
             title: 'กำลังดำเนินการ...', 
             allowOutsideClick: false, 
             didOpen: () => Swal.showLoading(), 
             customClass:{popup:'rounded-4'} 
         });
         
         try { 
             const r = await callAPI('rollbackInvoice', { invoiceNo: invoiceNo }); 
             if(r.success) { 
                 Swal.fire({ 
                     icon: 'success', 
                     title: 'สำเร็จ', 
                     text: r.message, 
                     customClass: {popup:'rounded-4'} 
                 }); 
                 loadBillingData(); 
             } else { 
                 Swal.fire('เกิดข้อผิดพลาด', r.message, 'error'); 
             } 
         } catch(err) { 
             Swal.fire('เกิดข้อผิดพลาด', err.message, 'error'); 
         }
      }
   });
}

function promptRollbackReceipt(invoiceNo, docNoToDel, docTypeToDel) {
   let txt = docTypeToDel === 'REC' ? 'ใบเสร็จรับเงิน' : 'ใบสำคัญรับ';
   Swal.fire({ 
       title: `ลบ${txt}?`, 
       html: `คุณแน่ใจหรือไม่ว่าต้องการลบ <b class="text-danger">${docNoToDel}</b>`, 
       icon: 'warning', 
       showCancelButton: true, 
       confirmButtonColor: '#ef4444', 
       confirmButtonText: `ยืนยันลบ`, 
       cancelButtonText: 'ยกเลิก', 
       customClass:{popup:'rounded-4'}
   }).then(async res => {
      if(res.isConfirmed) {
         Swal.fire({ 
             title: 'กำลังลบ...', 
             allowOutsideClick: false, 
             didOpen: () => Swal.showLoading(), 
             customClass:{popup:'rounded-4'} 
         });
         
         try { 
             const r = await callAPI('rollbackReceipt', { invoiceNo: invoiceNo, docType: docTypeToDel }); 
             if(r.success) { 
                 Swal.fire({ 
                     icon: 'success', 
                     title: 'ลบสำเร็จ', 
                     text: r.message, 
                     customClass:{popup:'rounded-4'} 
                 }); 
                 loadBillingData(); 
             } else { 
                 Swal.fire('เกิดข้อผิดพลาด', r.message, 'error'); 
             } 
         } catch(err) { 
             Swal.fire('เกิดข้อผิดพลาด', err.message, 'error'); 
         }
      }
   });
}

async function printPDF(docNo) {
   Swal.fire({ 
       title: 'กำลังเรียกดู...', 
       text: 'กำลังดึงลิงก์เอกสาร', 
       allowOutsideClick: false, 
       didOpen: () => Swal.showLoading(), 
       customClass:{popup:'rounded-4'} 
   });
   
   try {
       const res = await callAPI('getPdfUrl', { docNo: docNo });
       
       if(res.success) { 
           Swal.fire({ 
               title: `<i class="bi bi-file-earmark-pdf text-primary fs-1"></i>`, 
               html: `<h4 class="fw-bold mb-3">${docNo}</h4><a href="${res.url}" target="_blank" class="btn btn-primary btn-lg rounded-pill px-5 fw-bold shadow" onclick="Swal.close()">เปิดเอกสาร</a>`, 
               showConfirmButton: false, 
               showCloseButton: true, 
               customClass:{popup:'rounded-4'} 
           }); 
       } else { 
           Swal.fire({ 
               icon: 'error', 
               text: res.message, 
               customClass:{popup:'rounded-4'} 
           }); 
       }
   } catch(err) { 
       Swal.fire('เกิดข้อผิดพลาด', err.message, 'error'); 
   }
}

// ================= Receipt & Voucher =================
let currentReceiptInvNo = ""; 
let currentDocType = ""; 

function openReceiptModal(invNo, docType) {
    currentReceiptInvNo = invNo; 
    currentDocType = docType;
    
    const header = document.getElementById('recModalHeader'); 
    const icon = document.getElementById('recModalIcon'); 
    const titleText = document.getElementById('recModalTitleText'); 
    const info = document.getElementById('recModalInfo'); 
    const btn = document.getElementById('btnConfirmReceipt'); 
    const btnText = document.getElementById('btnConfirmReceiptText'); 
    const spinner = document.getElementById('loadingSpinnerRec'); 
    const loadingText = document.getElementById('loadingTextRec');
    
    if(docType === 'RECEIPT') {
        if(header) header.className = 'modal-header bg-success bg-gradient text-white border-0 py-3'; 
        if(icon) icon.className = 'bi bi-receipt-cutoff me-2'; 
        if(titleText) titleText.innerText = 'ออกใบเสร็จรับเงิน'; 
        if(info) info.innerHTML = `<span class="badge bg-success bg-opacity-10 text-success border border-success fw-bold">คำนวณเฉพาะยอดค่าขนส่ง (Freight Charge)</span>`; 
        if(btn) btn.className = 'btn btn-success rounded-pill px-5 fw-bold shadow-sm'; 
        if(btnText) btnText.innerText = 'สร้างใบเสร็จรับเงิน'; 
        if(spinner) spinner.className = 'spinner-border text-success'; 
        if(loadingText) { 
            loadingText.className = 'mt-2 fw-bold text-success'; 
            loadingText.innerText = 'กำลังสร้างใบเสร็จ...'; 
        }
    } else {
        if(header) header.className = 'modal-header bg-info bg-gradient text-dark border-0 py-3'; 
        if(icon) icon.className = 'bi bi-cash-coin me-2'; 
        if(titleText) titleText.innerText = 'ออกใบสำคัญรับ'; 
        if(info) info.innerHTML = `<span class="badge bg-info bg-opacity-10 text-info border border-info fw-bold">คำนวณเฉพาะยอดสำรองจ่าย (Advance Payment)</span>`; 
        if(btn) btn.className = 'btn btn-info text-dark rounded-pill px-5 fw-bold shadow-sm'; 
        if(btnText) btnText.innerText = 'สร้างใบสำคัญรับ'; 
        if(spinner) spinner.className = 'spinner-border text-info'; 
        if(loadingText) { 
            loadingText.className = 'mt-2 fw-bold text-info'; 
            loadingText.innerText = 'กำลังสร้างใบสำคัญ...'; 
        }
    }
    
    if(document.getElementById('recInvoiceNoLabel')) {
        document.getElementById('recInvoiceNoLabel').innerText = invNo;
    }
    
    let today = new Date(); 
    if(document.getElementById('modReceiptDate')) {
        document.getElementById('modReceiptDate').value = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, '0') + "-" + String(today.getDate()).padStart(2, '0');
    }
    
    if(document.getElementById('recModeDetail')) {
        document.getElementById('recModeDetail').checked = true; 
    }
    
    if(document.getElementById('recShowDueDate')) {
        document.getElementById('recShowDueDate').checked = true;
    }
    
    if(document.getElementById('loadingGenReceipt')) {
        document.getElementById('loadingGenReceipt').style.display = 'none'; 
    }
    
    if(btn) {
        btn.disabled = false;
    }
    
    if(document.getElementById('receiptSettingModal')) {
        new bootstrap.Modal(document.getElementById('receiptSettingModal')).show();
    }
}

async function confirmGenerateReceipt() {
    let recDate = document.getElementById('modReceiptDate').value; 
    let layoutMode = document.getElementById('recModeDetail').checked ? 'DETAIL' : 'SUMMARY'; 
    let showDueDate = document.getElementById('recShowDueDate').checked;
    
    if(!recDate) {
        return Swal.fire({ 
            icon: 'warning', 
            text: 'กรุณาระบุวันที่', 
            customClass: {popup: 'rounded-4'} 
        });
    }
    
    let loadingContainer = document.getElementById('loadingGenReceipt'); 
    let btnConf = document.getElementById('btnConfirmReceipt');
    
    if(loadingContainer) loadingContainer.style.display = 'block'; 
    if(btnConf) btnConf.disabled = true;

    try {
        const res = await callAPI('generateReceiptPDF', { 
            invoiceNo: currentReceiptInvNo, 
            docDate: recDate, 
            layoutMode: layoutMode, 
            billingUser: currentUser, 
            docType: currentDocType, 
            showDueDate: showDueDate 
        });
        
        if(loadingContainer) loadingContainer.style.display = 'none'; 
        if(btnConf) btnConf.disabled = false;
        
        if(res.success) {
            if(document.getElementById('receiptSettingModal')) {
                bootstrap.Modal.getInstance(document.getElementById('receiptSettingModal')).hide();
            }
            
            let docName = currentDocType === 'RECEIPT' ? 'ใบเสร็จรับเงิน' : 'ใบสำคัญรับ'; 
            let btnClass = currentDocType === 'RECEIPT' ? 'btn-success' : 'btn-info text-dark';
            
            Swal.fire({ 
                icon: 'success', 
                title: `สร้าง${docName}สำเร็จ!`, 
                html: `<a href="${res.pdfUrl}" target="_blank" class="btn ${btnClass} btn-lg rounded-pill mt-3 px-5 fw-bold shadow-sm" onclick="Swal.close()"><i class="bi bi-file-earmark-pdf-fill me-2"></i> เปิดดูเอกสาร</a>`, 
                showConfirmButton: false, 
                showCloseButton: true, 
                customClass: {popup: 'rounded-4'}, 
                didClose: () => { loadBillingData(); } 
            });
        } else { 
            Swal.fire({ 
                icon: 'error', 
                text: res.message, 
                customClass: {popup: 'rounded-4'} 
            }); 
        }
    } catch(err) {
        if(loadingContainer) loadingContainer.style.display = 'none'; 
        if(btnConf) btnConf.disabled = false; 
        Swal.fire('เกิดข้อผิดพลาด', err.message, 'error');
    }
}
