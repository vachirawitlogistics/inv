const GAS_URL = 'https://script.google.com/macros/s/AKfycbwnPUd6WiFNs_jMwR2W8nJbT-iH3o2AKy1owdIcT1L5SEdn1exyarqzPnSHm5gaK_Cj/exec';

async function callAPI(action, params = {}, retries = 2, showLoader = true) {
    const token = localStorage.getItem('billingToken');
    
    if (showLoader && typeof showGlobalLoader === 'function') {
        showGlobalLoader();
    }
    
    for (let i = 0; i <= retries; i++) {
        try {
            const response = await fetch(GAS_URL, { 
                method: 'POST', 
                redirect: 'follow',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
                body: JSON.stringify({ 
                    action: action, 
                    params: params, 
                    token: token 
                }) 
            });
            
            const result = await response.json();
            
            // ป้องกันกรณี Backend โยน {success: false, message: ...} กลับมา
            if (result && result.success === false && result.message) {
                 throw new Error(result.message);
            }
            
            if (result && result.error && !result.success && !result.message) {
                if (result.error.includes("SESSION_EXPIRED")) {
                    logout();
                    throw new Error("Session หมดอายุ กรุณาล็อกอินใหม่");
                }
                throw new Error(result.error);
            }
            
            if (showLoader && typeof hideGlobalLoader === 'function') hideGlobalLoader();
            return result;
            
        } catch (error) { 
            if (i === retries || error.message.includes("Session หมดอายุ")) {
                if (showLoader && typeof hideGlobalLoader === 'function') hideGlobalLoader();
                throw new Error(error.message); // คืนค่าข้อความ Error ตรงๆ ไม่ต้องแปะ 'API Error:' แล้ว
            }
            await new Promise(r => setTimeout(r, 1000 * (i + 1))); 
        }
    }
    
    if (showLoader && typeof hideGlobalLoader === 'function') hideGlobalLoader();
}