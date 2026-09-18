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
                redirect: 'follow', // เพิ่มบรรทัดนี้
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
                body: JSON.stringify({ 
                    action: action, 
                    params: params, 
                    token: token 
                }) 
            });
            
            const result = await response.json();
            
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
                throw new Error('API Error: ' + error.message); 
            }
            await new Promise(r => setTimeout(r, 1000 * (i + 1))); 
        }
    }
    
    if (showLoader && typeof hideGlobalLoader === 'function') hideGlobalLoader();
}