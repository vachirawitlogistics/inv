const GAS_URL = 'https://script.google.com/macros/s/AKfycbwnPUd6WiFNs_jMwR2W8nJbT-iH3o2AKy1owdIcT1L5SEdn1exyarqzPnSHm5gaK_Cj/exec';

async function callAPI(action, params = {}, retries = 5, showLoader = true) {
    const token = localStorage.getItem('billingToken');
    
    if (showLoader && typeof showGlobalLoader === 'function') showGlobalLoader();
    
    for (let i = 0; i <= retries; i++) {
        try {
            // ส่งรูปแบบ Basic ที่สุด ไม่ใส่ Header หรือ Credentials ให้ Google สับสน
            const response = await fetch(GAS_URL, { 
                method: 'POST', 
                redirect: 'follow', // บังคับให้ตามลิงก์ Redirect 302 ของ Google
                credentials: 'omit', // ป้องกันปัญหาบั๊กเมื่อล็อกอินบัญชี Google ค้างไว้หลายแอคเคาท์
                headers: { 
                    'Content-Type': 'text/plain;charset=utf-8' // สำคัญมาก: ป้องกันเบราว์เซอร์เตะเข้าโหมด CORS Preflight
                }, 
                body: JSON.stringify({ action: action, params: params, token: token }) 
            });
            
            const result = await response.json();
            
            // ถ้าระบบบอกว่าติดคิวคนอื่นอยู่ ให้โยน Error เพื่อเตะเข้ากระบวนการลองใหม่ (catch)
            if (result && result.success === false && result.message && result.message.includes("เซิร์ฟเวอร์กำลังประมวลผล")) {
                throw new Error("SERVER_BUSY");
            }
            
            if (showLoader && typeof hideGlobalLoader === 'function') hideGlobalLoader();
            return result;
            
        } catch (error) { 
            // ถ้ารอบสุดท้าย (ครบ 5 ครั้ง หรือประมาณ 15 วินาที) แล้วยังไม่ได้ ค่อยแจ้งเตือน
            if (i === retries) {
                if (showLoader && typeof hideGlobalLoader === 'function') hideGlobalLoader();
                return { 
                    success: false, 
                    message: error.message === "SERVER_BUSY" ? "ระบบมีผู้ใช้งานหนาแน่น กรุณาลองใหม่อีกครั้งครับ" : error.toString() 
                };
            }
            // ถ้ายังไม่ครบ 5 รอบ ให้หยุดรอ 3 วินาที แล้ววนลูปยิงไปใหม่เงียบๆ
            await new Promise(resolve => setTimeout(resolve, 3000)); 
        }
    }
}