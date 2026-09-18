const GAS_URL = 'https://script.google.com/macros/s/AKfycbwnPUd6WiFNs_jMwR2W8nJbT-iH3o2AKy1owdIcT1L5SEdn1exyarqzPnSHm5gaK_Cj/exec';

async function callAPI(action, params = {}, retries = 5, showLoader = true) {
    const token = localStorage.getItem('invToken');
    
    if (showLoader && typeof showGlobalLoader === 'function') showGlobalLoader();
    
    for (let i = 0; i <= retries; i++) {
        try {
            const response = await fetch(GAS_URL, { 
                method: 'POST', 
                redirect: 'follow', 
                credentials: 'omit', 
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: action, params: params, token: token }) 
            });
            
            const result = await response.json();
            
            if (result && result.success === false && result.message && result.message.includes("เซิร์ฟเวอร์กำลังประมวลผล")) {
                throw new Error("SERVER_BUSY");
            }
            
            if (showLoader && typeof hideGlobalLoader === 'function') hideGlobalLoader();
            return result;
            
        } catch (error) { 
            if (i === retries) {
                if (showLoader && typeof hideGlobalLoader === 'function') hideGlobalLoader();
                return { 
                    success: false, 
                    message: error.message === "SERVER_BUSY" ? "ระบบมีผู้ใช้งานหนาแน่น กรุณาลองใหม่อีกครั้งครับ" : error.toString() 
                };
            }
            await new Promise(resolve => setTimeout(resolve, 3000)); 
        }
    }
}