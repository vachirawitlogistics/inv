const GAS_URL = 'https://script.google.com/macros/s/AKfycbyAY1IFG4By3uwMdh-OUgYrYqEP7YHRzB56gNM9TMT9waQXfofDI2ML9muI-Ag4TLYz/exec';

async function callAPI(action, params = {}, retries = 3, showLoader = true) {
    const token = localStorage.getItem('invToken');
    
    if (showLoader && typeof showGlobalLoader === 'function') showGlobalLoader();
    
    for (let i = 0; i <= retries; i++) {
        try {
            if (i > 0) await new Promise(res => setTimeout(res, 1000 * i + Math.random() * 1000));

            const response = await fetch(GAS_URL, { 
                method: 'POST', 
                redirect: 'follow',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: action, params: params, token: token }) 
            });
            
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            
            const text = await response.text();
            let result;
            
            try { 
                result = JSON.parse(text); 
            } catch (e) { 
                throw new Error("Server Error"); 
            }
            
            if (result && result.success === false && result.message) {
                if (result.message.includes("ประมวลผล")) throw new Error("BUSY");
                throw new Error(result.message);
            }
            
            if (showLoader && typeof hideGlobalLoader === 'function') hideGlobalLoader();
            return result;
            
        } catch (error) { 
            if (i === retries) {
                if (showLoader && typeof hideGlobalLoader === 'function') hideGlobalLoader();
                return { 
                    success: false, 
                    message: error.message === "BUSY" ? "ระบบหนาแน่น กรุณาลองใหม่" : "การเชื่อมต่อขัดข้อง" 
                };
            }
        }
    }
}