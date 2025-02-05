import './App.css';
import { useRef, useState, useEffect } from "react";

function App() {
  const [stream, setStream] = useState(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const [ws, setSocket] = useState(null);
  // WebSocket을 useRef로 관리하여 비동기 문제 해결

  const servers = {
    iceServers: [], // STUN/TURN 서버 없음
    iceTransportPolicy: "all", // Host Candidate만 사용
  };
// const servers = {
//   iceServers: [{ url: "stun:stun.l.google.com:19302" }],
// };

peerConnection.current = new RTCPeerConnection(servers);


  // ✅ 1. 로컬 비디오 스트리밍 시작
  const startStreaming = async () => {
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: true,
    });
    setStream(newStream);
    localVideoRef.current.srcObject = newStream;
  };

  // ✅ 2. 비디오 스트리밍 정지
  const stopStreaming = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      localVideoRef.current.srcObject = null;
    }
  };

  const setForSending = async () => {

// ✅ WebRTC 피어 연결 생성
    peerConnection.current = new RTCPeerConnection(servers);

// ✅ ICE Candidate 감지
    peerConnection.current.onicecandidate = (event) => {
        console.log("\n\nonicecandidate 감지!!!");
        console.log("ice candidate 상태 : ", peerConnection.current.iceConnectionState,"\n\n");
        if (event.candidate) {
            console.log("ICE Candidate 전송:", event.candidate);
            ws.send(
                JSON.stringify({
                    type: "SDPOfferAnswerExchange",
                    clientId: "client1",
                    signalData: {type: "candidate", candidate: event.candidate },
                })
            );
        }
    };

    stream.getTracks().forEach(track => {
      peerConnection.current.addTrack(track, stream);
    });

    //오퍼 보내기
    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);
    console.log("SDP Offer 생성 완료:", offer);
    ws.send(
      JSON.stringify({
      type:"SDPOfferAnswerExchange",
      clientId: "client1",
      signalData : peerConnection.current.localDescription,
      })
    );
    console.log("SDP Offer 보냄\n\n", offer);


    
    ws.onmessage = async (event) => {               //시그널 서버 듣고 있다가
      const data = JSON.parse(event.data);
      console.log("수신된 시그널링 데이터 타입:", data.type);
      
      if (data.type === "answer") {
        // ✅ SDP Answer 수신 시 Remote Description 설정
        console.log("SDP Answer 받음")
        await peerConnection.current.setRemoteDescription(data);
        peerConnection.current.addIceCandidate(data.candidate);
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
    
};

const connectWebSocket = () => {
  var ws = new WebSocket("ws://localhost:8080");
  setSocket(ws);
  ws.onerror = (error) => {
    console.error("WebSocket 오류:", error);
  };

  // ✅ WebSocket 연결이 되면 요청을 보낸다.
  ws.onopen = () => {
    console.log("WebSocket 연결 완료");
    ws.send(JSON.stringify({ type: "letsConnect", clientId: "client1" }));
  
  
  };
}
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
      <h1>React WebRTC Video Streaming</h1>
      <h2>Stream client</h2>
      <button onClick={startStreaming}>Start Streaming</button>
      <button onClick={stopStreaming}>Stop Streaming</button>
      <button onClick={connectWebSocket}>connect WebSocket</button>
      <button onClick={setForSending}>Set for Sending</button>
      <button onClick={checkConnection}>check connection</button>
      
      <div>
        <div>
          <h3>Local Video</h3>
          <video ref={localVideoRef} autoPlay style={{ transform: "scaleX(-1)" }}></video>
        </div>
        
      </div>
    </div>
  );
}

export default App;
