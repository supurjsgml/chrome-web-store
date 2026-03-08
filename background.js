const SYNC_ALARM_NAME = "resumeSync";

// 알람 트리거 발생 시 실행되는 로직
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === SYNC_ALARM_NAME) {
        console.log("[백그라운드] 갱신 주기 도달. API 호출 시도...");

        // Storage에서 직접 데이터를 꺼내와 실행 (전역 변수 의존 X)
        const result = await chrome.storage.local.get("requestBody");
        if (!result.requestBody) {
            console.log("[백그라운드] 저장된 정보 없음. 알람 종료");
            chrome.alarms.clear(SYNC_ALARM_NAME);
            return;
        }

        try {
            const response = await fetch("https://xn--v69a93jfng.xn--hk3b17f.xn--3e0b707e/member/jobKorea/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(result.requestBody)
            });

            const data = await response.json();
            if (response.ok && data.success) {
                console.log("[백그라운드] 자동 갱신 성공:", new Date().toLocaleTimeString());
            }
        } catch (error) {
            console.error("[백그라운드] API 호출 오류:", error);
        }
    }
});

// 자동 갱신 시작 함수
function startSyncing(requestBody) {
    // 1. 데이터 저장
    chrome.storage.local.set({ requestBody }, () => {
        // 2. 알람 생성 (기존 알람이 있으면 덮어씌움)
        chrome.alarms.create(SYNC_ALARM_NAME, {
            periodInMinutes: 30 // 30분마다 반복 실행 (테스트 시 1분 미만은 불안정할 수 있음)
        });
        console.log("[백그라운드] 스케쥴러 등록 완료");
    });
}

// 메시지 리스너
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "startSyncing") {
        startSyncing(message.requestBody);
        sendResponse({ status: "sync_started" });
    }
    if (message.action === "stopSyncing") {
        chrome.alarms.clear(SYNC_ALARM_NAME);
        chrome.storage.local.remove("requestBody");
        sendResponse({ status: "sync_stopped" });
    }
    return true; // 비동기 응답 유지
});