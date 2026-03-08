document.addEventListener("DOMContentLoaded", function () {
    let isSyncing = false; // 자동 갱신 상태 확인 변수

    //안내 메시지 표시 (로그인 진행 중)
    function showMessage(text, autoHide = false) {
        const messageBox = document.getElementById("messageBox");
        messageBox.textContent = text;
        messageBox.style.opacity = "1";
        messageBox.style.transform = "translateY(0)";

        if (autoHide) {
            setTimeout(() => {
                hideMessage();
            }, 3000); // 3초 후 자동 숨김
        }
    }

    //안내 메시지 숨기기
    function hideMessage() {
        const messageBox = document.getElementById("messageBox");
        messageBox.style.opacity = "0";
        messageBox.style.transform = "translateY(-10px)";
    }

    //로그인 실패 및 오류 메시지 표시 (버튼 아래)
    function showErrorMessage(text) {
        const errorBox = document.getElementById("errorMessage");
        errorBox.textContent = text;
        errorBox.classList.add("show"); // CSS `show` 클래스 추가

        setTimeout(() => {
            hideErrorMessage();
        }, 3000); // 3초 후 자동 숨김
    }

    //로그인 실패 메시지 숨기기 (빈 공간 제거)
    function hideErrorMessage() {
        const errorBox = document.getElementById("errorMessage");
        errorBox.classList.remove("show"); // CSS `show` 클래스 제거
        setTimeout(() => {
            errorBox.textContent = ""; // 텍스트도 초기화
        }, 500);
    }

    //저장된 토큰 확인 후 UI 업데이트
    chrome.storage.local.get(["authToken"], function (result) {
        if (result.authToken) {
            console.log("[팝업] 저장된 토큰 확인됨:", result.authToken);
            isSyncing = true;
            loginAction("동기화 중지", false);
        } else {
            console.log("[팝업] 저장된 토큰 없음");
            loginAction("로그인", false);
        }
    });

    //로그인 폼 제출 이벤트
    document.getElementById("loginForm").addEventListener("submit", async function (event) {
        event.preventDefault(); // 기본 제출 방지

        if (isSyncing) {
            stopSyncing();
            return;
        }

        const idInput = document.getElementById("id");
        const pwInput = document.getElementById("password");
        const id = idInput.value.trim();
        const pw = pwInput.value.trim();

        // 기존 오류 메시지 제거
        clearError(idInput);
        clearError(pwInput);
        hideErrorMessage();

        let hasError = false;
        if (!id) { showError(idInput, "아이디를 입력해주세요."); hasError = true; }
        if (!pw) { showError(pwInput, "비밀번호를 입력해주세요."); hasError = true; }
        if (hasError) return;

        loginAction("동기화 진행중", true);
        showMessage("로그인 중입니다. 잠시만 기다려주세요...", true);

        const requestBody = { id, pw };

        // [핵심 수정] fetch 대신 백그라운드에 메시지 전송
        chrome.runtime.sendMessage({
            action: "startSyncing",
            requestBody
        }, function (response) {
            console.log("[팝업] 백그라운드 응답:", response);

            if (response && response.status === "sync_started" && response.data.success) {
                showMessage("로그인에 성공하였습니다.", true);
                isSyncing = true;
                loginAction("동기화 중지", false);
            } else {
                // 서버 오류이거나 로그인 실패인 경우
                const errorMsg = response?.data?.message || response?.error || "로그인 실패. 다시 시도해주세요.";
                showErrorMessage(errorMsg);
                loginAction("로그인", false);
            }
        });
    });

    //닫기 버튼
    document.querySelector(".close-btn").addEventListener("click", function () {
        window.close();
    });

    function loginAction(msg, isLoading) {
        const loginButton = document.querySelector("button[type='submit']");
        const buttonText = loginButton.querySelector(".button-text");
        const loadingSpinner = loginButton.querySelector(".loading-spinner");

        buttonText.textContent = msg;

        if (isLoading) {
            loginButton.disabled = true;  // 버튼 비활성화
            loginButton.classList.add("btn-loading"); // 로딩 상태 추가
        } else {
            loginButton.disabled = false; // 버튼 활성화
            loginButton.classList.remove("btn-loading"); // 로딩 상태 해제
        }
    }

    function stopSyncing() {
        //스토리지에서 저장된 정보를 가져옴
        chrome.storage.local.get(["requestBody"], function (result) {
            const requestBody = result.requestBody;

            //백그라운드에 로그아웃 요청 시 데이터 전달
            chrome.runtime.sendMessage({
                action: "stopSyncing",
                requestBody: requestBody // id를 포함한 전체 객체 전달
            }, function (response) {
                console.log("[팝업] 백그라운드에 중지 요청:", response);
            });

            //로컬 데이터 삭제
            chrome.storage.local.remove(["authToken", "requestBody"], function () {
                console.log("[팝업] 저장된 정보 삭제 완료");
            });
        });

        isSyncing = false;
        hideErrorMessage();
        loginAction("로그인", false);
    }

    function showError(input, message) {
        clearError(input);
        const errorMsg = document.createElement("div");
        errorMsg.className = "error-message";
        errorMsg.textContent = message;
        input.classList.add("input-error");
        input.parentNode.appendChild(errorMsg);
    }

    function clearError(input) {
        input.classList.remove("input-error");
        const existingError = input.parentNode.querySelector(".error-message");
        if (existingError) {
            existingError.remove();
        }
    }

    document.getElementById("id").addEventListener("input", function () {
        clearError(this);
    });

    document.getElementById("password").addEventListener("input", function () {
        clearError(this);
    });

    //[팝업 상단] 저장된 정보로 폼 채우기
    chrome.storage.local.get(["requestBody", "authToken"], function (result) {
        if (result.requestBody) {
            document.getElementById("id").value = result.requestBody.id || "";
            document.getElementById("password").value = result.requestBody.pw || "";
        }

        if (result.authToken) {
            isSyncing = true;
            loginAction("동기화 중지", false);
        } else {
            loginAction("로그인", false);
        }
    });
});
