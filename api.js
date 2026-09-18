const GAS_URL = 'https://script.google.com/macros/s/AKfycbyiugspGphfRFBGWOAptcenyZ6Rp5QGHxwyvuOBdmYiLKuJKWzMi-sjodlsLuBw6xXZ/exec';

// เพิ่ม parameter showLoader เพื่อสั่งเปิด/ปิด หน้าจอโหลดหมุนๆ
async function callAPI(action, params = {}, retries = 2, showLoader = true) {
    const token = localStorage.getItem('billingToken');
    
    if (showLoader && typeof showGlobalLoader === 'function') {
        showGlobalLoader();
    }
    
    for (let i = 0; i <= retries; i++) {
        try {
            const response = await fetch(GAS_URL, { 
                method: 'POST', 
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
