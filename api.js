// URL ที่ยิงไปยัง Google Apps Script (API)
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyiugspGphfRFBGWOAptcenyZ6Rp5QGHxwyvuOBdmYiLKuJKWzMi-sjodlsLuBw6xXZ/exec';


async function callAPI(action, params = {}, retries = 2) {
    const token = localStorage.getItem('billingToken');
    
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
            
            if (result && (result.error || result.success === false)) {
                let errText = result.error || result.message || "Unknown API Error";
                
                // หาก Token หมดอายุให้เตะกลับไปหน้า Login
                if (errText.includes("SESSION_EXPIRED")) {
                    logout();
                    throw new Error("Session หมดอายุ กรุณาล็อกอินใหม่");
                }
                throw new Error(errText);
            }
            
            return result;
            
        } catch (error) { 
            // หากหมดโควต้า Retry หรือเป็น Error เรื่อง Session ให้ throw ทันที
            if (i === retries || error.message.includes("Session หมดอายุ")) {
                throw new Error('API Error: ' + error.message); 
            }
            // รอเวลาแบบหน่วงเพิ่มขึ้น (Exponential Backoff) ก่อนลองยิง API ใหม่
            await new Promise(r => setTimeout(r, 1000 * (i + 1))); 
        }
    }
}
