import React from 'react'
import logo from './logo.svg'
import './App.less'
import { io, Socket } from 'socket.io-client';
import { People, Message, SendMsg } from './type';
import VideoPanel from './coms/videoPanel';
import Chatroom from './coms/chatroom';
import {DIST_INFO, CHAT_MESSAGE, SYSTEM_MESSAGE, MEMBER_CHANGE, SEND_OFFER, RECEIVE_OFFER, SEND_ANSWER, SEND_CANDIDATE, RECEIVE_CANDIDATE, RECEIVE_ANSWER} from './const';
import 'antd/dist/antd.css';

type State = {
  info: People;
  msgs: Message[];
  peopleList: People[];
}

class App extends React.Component<unknown, State> {
  state: State = {
    info: {id: 0, name: ''},
    peopleList: [],
    msgs: [],
  };
  socket: ReturnType<typeof io>;
  panelRef = React.createRef<VideoPanel>()

  constructor(props: unknown) {
    super(props);
    const socket = io();
    this.socket = socket;
  }

  componentDidMount() {
    const {socket} = this;
    socket.on(DIST_INFO, (info: People) => {
      this.setState({
        info
      })
    });

    socket.on(CHAT_MESSAGE, (msg: Message) => {
      this.setState({
        msgs: [
          ...this.state.msgs,
          msg
        ]
      });
    })

    socket.on(MEMBER_CHANGE, (list: People[]) => {
      this.setState({
        peopleList: list
      })
    });

    socket.on(RECEIVE_OFFER, offer => {
      this.panelRef.current?.handleReceiveOffer(offer);
    });

    socket.on(RECEIVE_ANSWER, answer => {
      this.panelRef.current?.handleReceiveAnswer(answer);
    });

    socket.on(RECEIVE_CANDIDATE, candidate => {
      this.panelRef.current?.handleReceiveCandidate(candidate);
    })
  }

  // 发消息
  handleSendMsg = (msg: SendMsg) => {
    this.socket.emit(CHAT_MESSAGE, msg);
  }

  // 发送 offer
  handleSendOffer = (id: number, sdp?: RTCSessionDescription | null) => {
    this.socket.emit(SEND_OFFER, {
      to: id,
      sdp,
      type: 'video-offer'
    })
  }

  // 发送 answer
  handleSendAnswer = (id: number, sdp?: RTCSessionDescription | null) => {
    this.socket.emit(SEND_ANSWER, {
      to: id,
      sdp,
      type: 'video-answer'
    });
  }

  // 发送 candidate
  handleSendCandidate = (candidate: any) => {
    this.socket.emit(SEND_CANDIDATE, candidate);
  }

  render() {
    const {info, peopleList, msgs} = this.state;
    const others = peopleList.filter(p => p.id !== info.id);
    return (
      <div className="App">
        <VideoPanel
          ref={this.panelRef}
          info={info}
          peopleList={others}
          onSendOffer={this.handleSendOffer}
          onSendAnswer={this.handleSendAnswer}
          onSendCandidate={this.handleSendCandidate}
        />

        <Chatroom
          info={info}
          peopleList={others}
          messages={msgs}
          onSend={this.handleSendMsg}
        />
      </div>
    )
  }
}

export default App
