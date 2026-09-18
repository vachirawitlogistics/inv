const GAS_URL = 'https://script.google.com/macros/s/AKfycbwnPUd6WiFNs_jMwR2W8nJbT-iH3o2AKy1owdIcT1L5SEdn1exyarqzPnSHm5gaK_Cj/exec';

async function callAPI(action, params = {}, retries = 5, showLoader = true) {
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

      if (result && result.success === false) {
        if (result.message && result.message.includes("เซิร์ฟเวอร์กำลังประมวลผลให้ผู้ใช้อื่นอยู่")) {
          throw new Error("SERVER_BUSY");
        }

        if (result.error && result.error.includes("SESSION_EXPIRED")) {
          if (typeof logout === 'function') logout();
          throw new Error("Session หมดอายุ กรุณาล็อกอินใหม่");
        }

        if (showLoader && typeof hideGlobalLoader === 'function') hideGlobalLoader();
        return result;
      }

      if (showLoader && typeof hideGlobalLoader === 'function') hideGlobalLoader();
      return result;

    } catch (error) {
      if (i === retries || error.message.includes("Session หมดอายุ")) {
        if (showLoader && typeof hideGlobalLoader === 'function') hideGlobalLoader();

        if (error.message === "SERVER_BUSY") {
          throw new Error("ระบบมีผู้ใช้งานหนาแน่น กรุณาลองใหม่อีกครั้งครับ");
        }
        throw error;
      }

      const waitTime = error.message === "SERVER_BUSY" ? 3000 : 1000 * (i + 1);
      console.log(`กำลังลองเชื่อมต่อใหม่รอบที่ ${i + 1}... (Action: ${action})`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}