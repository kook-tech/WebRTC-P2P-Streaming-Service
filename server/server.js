const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });
const clients = {}; // 클라이언트 저장 객체 (roomId 기반으로 연결)

wss.on("connection", (socket) => {
    console.log("User connected");

    socket.on("message", (msg) => {
        const data = JSON.parse(msg);
        console.log("수신된 데이터:", data);

        switch (data.type) {
            case "letsConnect":
                console.log(`📡 ${data.clientId} 가 연결 요청`);
                // 송신 클라이언트를 저장
                clients[data.clientId] = socket;
                console.log(`📡 ${data.clientId} 가 시그널 서버에 등록되었음.`);
                break;

            case "SDPOfferAnswerExchange":
            {   
                const { clientId, signalData } = data;

                // 모든 클라이언트에게 보내되, 본인(clientId)은 제외
                console.log(clientId,"가")
                Object.keys(clients).forEach((key) => {
                    if (key !== clientId && clients[key].readyState === WebSocket.OPEN) {
                        
                        console.log(`📨 ${key} 에게 신호 전송`);
                        console.log('icecandidate 찾기', signalData.type)
                        clients[key].send(JSON.stringify(signalData));
                    }
                });
            }
                break;

            default:
                console.log("⚠️ Unknown message type:", data.type);
        }
    });

    socket.on("close", () => {
        // 클라이언트가 연결 해제되면 clients 객체에서 삭제
        Object.keys(clients).forEach((key) => {
            if (clients[key] === socket) {
                delete clients[key];
                console.log(`❌ ${key}가 연결 종료됨`);
            }
        });
    });
});

console.log("WebSocket 시그널링 서버가 8080 포트에서 실행 중...");
