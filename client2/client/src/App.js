import './App.css';
import { useRef, useState, useEffect } from "react";

function App() {
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const [ws, setSocket] = useState(null);

  const servers = {
    iceServers: [], // STUN/TURN 서버 없음
    iceTransportPolicy: "all", // Host Candidate만 사용
  };

// const servers = {
//   iceServers: [{ url: "stun:stun.l.google.com:19302" }],
// };

peerConnection.current = new RTCPeerConnection(servers);

  const connectWebSocket = () => {
    var ws = new WebSocket("ws://localhost:8080");
    setSocket(ws);
    ws.onerror = (error) => {
      console.error("WebSocket 오류:", error);
    };

    // ✅ WebSocket 연결이 되면 요청을 보낸다.
    ws.onopen = () => {
      console.log("WebSocket 연결 완료");
      ws.send(JSON.stringify({ type: "letsConnect", clientId: "client2" }));
    
    
    };
  }
  const setForReceiveing = async () => {
    // ✅ WebSocket 연결

    // ✅ WebRTC 피어 연결 생성
    peerConnection.current = new RTCPeerConnection(servers);

    // ✅ ICE Candidate 감지
    peerConnection.current.onicecandidate = (event) => {
      console.log("onicecandidate 감지!!!");
      console.log("ice candidate 상태 : ", peerConnection.current.iceConnectionState,"\n\n");
      if (event.candidate) {
        console.log("ICE Candidate 전송:", event.candidate);
        ws.send(
          JSON.stringify({
            type: "SDPOfferAnswerExchange",
            clientId: "client2",
            signalData: {type: "candidate", candidate: event.candidate },
          })
        );
      }
    };



    
    // ✅ WebSocket 메시지 수신 핸들러 설정
    ws.onmessage = async (event) => {               //시그널 서버 듣고 있다가
      const data = JSON.parse(event.data);
      console.log("수신된 시그널링 데이터 타입:", data.type);
      
      if (data.type === "offer") {
        // ✅ SDP Offer 수신 시 Remote Description 설정 및 Answer 생성
        console.log("SDP Offer 수신:", data);
        await peerConnection.current.setRemoteDescription(data); //받은 오퍼로 setRemoteDescription
        const answer = await peerConnection.current.createAnswer(); //
        await peerConnection.current.setLocalDescription(answer);

        ws.send(
          JSON.stringify({
            type: "SDPOfferAnswerExchange",
            clientId: "client2",
            signalData: peerConnection.current.localDescription,
          })
        );
        console.log("answer 만들어서 보냄");
      } else if (data.type === "candidate") {
        // ✅ ICE Candidate 수신 후 추가 (remoteDescription이 존재하는 경우만)
        console.log("ice candidate 추가")
        // if (peerConnection.current.remoteDescription) {
        //   await peerConnection.current.addIceCandidate(data);
        // } else {
        //   console.warn("Remote Description이 설정되지 않음. ICE Candidate 대기.");
        // }
        peerConnection.current.addIceCandidate(data.candidate);
      } 
    };
    // return () => {
    //   console.log("소켓 닫음");
    //   ws.close();
    // }
    peerConnection.current.ontrack = (event) => {
      console.log("addtrack 이벤트 감지, 원격 스트림 설정됨.");
      remoteVideoRef.current.srcObject = event.streams[0];
    };
  };


  const checkConnection = () => { 
      console.log("ICE Connection State:", peerConnection.current.iceConnectionState);
      
      if (peerConnection.current.iceConnectionState === "connected") {
          console.log("✅ WebRTC P2P 연결 성공!");
      } else if (peerConnection.current.iceConnectionState === "disconnected") {
          console.warn("⚠️ WebRTC P2P 연결이 끊어짐.");
      } else if (peerConnection.current.iceConnectionState === "failed") {
          console.error("❌ WebRTC P2P 연결 실패.");
      }
  }

  return (
    <div className="App">
      <h1>React WebRTC Video Receive Streaming</h1>
      <h2>Receive Client</h2>
      <button onClick={connectWebSocket}>connect WebSocket</button>
      <button onClick={setForReceiveing}>Set For Receive Streaming</button>
      <button onClick={checkConnection}>check connection</button>
      <div>
        <div>
          <h3>Remote Video</h3>
          <video ref={remoteVideoRef} autoPlay></video>
        </div>
      </div>
    </div>
  );
}

export default App;
