//메시지 리스너
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    //로그인 요청 (동기화 시작)
    if (message.action === "startSyncing") {
        handleLogin(message.requestBody)
            .then(data => sendResponse({ status: "sync_started", data }))
            .catch(err => sendResponse({ status: "error", error: err.message }));
    }

    //로그아웃 요청 (동기화 중지)
    if (message.action === "stopSyncing") {
        handleLogout(message.requestBody)
            .then(data => sendResponse({ status: "sync_stopped", data }))
            .catch(err => sendResponse({ status: "error", error: err.message }));
    }

    return true; // 비동기 응답 유지를 위해 필수
});

//로그인 API 호출 함수
async function handleLogin(requestBody) {
    const response = await fetch("https://xn--v69a93jfng.xn--hk3b17f.xn--3e0b707e/member/jobKorea/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    //성공 시에만 토큰과 요청 바디를 저장
    if (response.ok && data.success) {
        await chrome.storage.local.set({
            authToken: data.data.token,
            requestBody
        });
    }

    return data; // 결과값을 그대로 반환
}

//로그아웃 API 호출 함수
async function handleLogout(requestBody) {
    const response = await fetch("https://xn--v69a93jfng.xn--hk3b17f.xn--3e0b707e/member/jobKorea/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
    });

    //로컬 스토리지 데이터 정리
    await chrome.storage.local.remove("requestBody");

    return await response.json();
}