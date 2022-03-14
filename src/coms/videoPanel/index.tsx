import React, { useEffect, useRef, memo, useState, useCallback } from "react";
import { People } from "../../type";
import './index.less';
import {Button} from 'antd';

type Candidate = {
    type: string;
    to: number;
    candidate: string;
};

type Props = {
    info: People,
    peopleList: People[];
    onSendOffer: (id: number, sdp?: RTCSessionDescription | null) => void
    onSendAnswer: (id: number, sdp?: RTCSessionDescription | null) => void;
    onSendCandidate: (candidate: Candidate) => void;
}

type State = {
    playing: boolean;
    connectId: number;
}

class VideoPanel extends React.Component<Props, State> {
    videoRef = React.createRef<HTMLVideoElement>();
    stream: null | MediaStream = null;
    connection: RTCPeerConnection | null = null;
    otherVideoRefs = [React.createRef<HTMLVideoElement>(), React.createRef<HTMLVideoElement>()]

    constructor(props: Props) {
        super(props);
        this.state = {
            playing: false,
            connectId: -1,
        }
    }
    
    componentWillUnmount() {
        if (this.videoRef.current) {
            this.videoRef.current.srcObject = null;
            this.videoRef.current.pause();
            this.setState({
                playing: false,
            })
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }
        }
    }

    handleOpenVideo = () => {
        console.log(navigator.mediaDevices);
        return navigator.mediaDevices.getUserMedia({video: true})
            .then(st => {
                this.stream = st;

                if (this.videoRef.current) {
                    this.videoRef.current.srcObject = st;
                    this.videoRef.current.play();
                    this.setState({
                        playing: true,
                    });
                }
            })
            .catch((e) => {
                console.log('视频 stream 获取失败', e);
            })
    }

    // 挑一个人视频连线
    handleConnect = (id: number) => {
        this.setState({
            connectId: id
        }, () => {
            this.createPeerConnenction();
            if (this.stream) {
                this.stream.getTracks().forEach(track => {
                    if (this.connection) {
                        this.connection.addTrack(track, this.stream!);
                    }
                })
            } else {
                this.handleOpenVideo().then(() => {
                    this.stream!.getTracks().forEach(track => {
                        if (this.connection) {
                            this.connection.addTrack(track, this.stream!);
                        }
                    })
                });
            }
        })
    }

    // 创建 RTCPeerConnection
    createPeerConnenction = () => {
        const peer = new RTCPeerConnection({
            iceServers: [
                {
                    urls: 'stun:localhost:3000'
                }
            ]
        });

        this.connection = peer;
        peer.addEventListener('icecandidate', this.handleICECandidate);
        peer.addEventListener('track', this.handleTrack);
        peer.addEventListener('negotiationneeded', this.handleNegoed);
        peer.addEventListener('removetrack', this.handleRemoveTrack);
        peer.addEventListener('iceconnectionstatechange', this.handleConnectionChange);
        peer.addEventListener('icegatheringstatechange', this.handleGatherChange)
        peer.addEventListener('signalingstatechange', this.handleSignalChange)
    };

    handleICECandidate = (event: any) => {
        console.log('ice candidate 事件');
        if (event.candidate) {
            this.props.onSendCandidate({
                type: 'new-ice-candidate',
                to: this.state.connectId,
                candidate: event.candidate,
            })
        }
    }

    handleTrack = (event: any) => {
        console.log('track event', this.otherVideoRefs[0].current);
        if (this.otherVideoRefs[0].current) {
            this.otherVideoRefs[0].current.srcObject = event.streams[0];
            this.otherVideoRefs[0].current.play();
        }
    }

    // 开始协商，发送本地 offer
    handleNegoed = () => {
        console.log('nego needed');
        if (this.connection) {
            this.connection.createOffer()
                .then(offer => {
                    return this.connection!.setLocalDescription(offer);
                })
                .then(() => {
                    this.props.onSendOffer(this.state.connectId, this.connection!.localDescription);
                })
                .catch((e) => {
                    console.log('send offer error', e);
                })
        }
    }

    handleRemoveTrack = () => {
        let stream = this.otherVideoRefs[0].current?.srcObject!;
        let trackList = (stream as MediaStream).getTracks();

        if (trackList.length === 0) {
            this.closeVideoCall();
        }
    }

    closeVideoCall() {
        let remoteVideo = this.otherVideoRefs[0].current!;
        let localVideo = this.videoRef.current!;

        if (this.connection) {
            const peer = this.connection
            peer.removeEventListener('icecandidate', this.handleICECandidate);
            peer.removeEventListener('track', this.handleTrack);
            peer.removeEventListener('negotiationneeded', this.handleNegoed);
            peer.removeEventListener('removetrack', this.handleRemoveTrack);
            peer.removeEventListener('iceconnectionstatechange', this.handleConnectionChange);
            peer.removeEventListener('icegatheringstatechange', this.handleGatherChange)
            peer.removeEventListener('signalingstatechange', this.handleSignalChange)
        }

        if (remoteVideo.srcObject) {
            (remoteVideo.srcObject as MediaStream).getTracks().forEach(track => track.stop())
        }

        if (localVideo.srcObject) {
            (localVideo.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        }

        this.connection?.close();
        this.connection = null;
    }

    handleConnectionChange = () => {
        console.log('connection change', this.connection?.iceConnectionState)
        switch (this.connection?.iceConnectionState) {
            case 'closed':
            case 'failed':
                this.closeVideoCall();
                break;
        }
    }

    handleGatherChange = () => {}

    handleSignalChange = () => {
        console.log('signal chage', this.connection?.signalingState);
        switch (this.connection?.signalingState) {
            case 'closed':
                this.closeVideoCall();
                break;
        }
    }

    // 收到对方发送的 offer
    handleReceiveOffer = (offer: any) => {
        console.log('组件收到 offer', offer);

        let localStream: MediaStream;
        this.createPeerConnenction();
        let desc = new RTCSessionDescription(offer.sdp);
        this.connection?.setRemoteDescription(desc)
            .then(() => {
                return navigator.mediaDevices.getUserMedia({video: true, audio: true})
                    .then(stream => {
                        localStream = stream;
                        if (this.videoRef.current) {
                            this.videoRef.current.srcObject = localStream;
                            this.videoRef.current.play();
                            this.setState({
                                playing: true,
                            });
                        }

                        localStream.getTracks().forEach(track => this.connection?.addTrack(track, localStream));
                    })
                    .then(() => {
                        return this.connection?.createAnswer();
                    })
                    .then(answer => {
                        return this.connection?.setLocalDescription(answer);
                    })
                    .then(() => {
                        this.props.onSendAnswer(offer.from, this.connection?.localDescription);
                    })
                    .catch((e) => {
                        console.log('send answer error', e);
                    })
            })
    }

    handleReceiveCandidate(candidate: any) {
        console.log('收到 candidate', candidate);
        let candi = new RTCIceCandidate(candidate.candidate);
        this.connection?.addIceCandidate(candi)
            .catch(e => console.log('add candidate error', e));
    }

    handleReceiveAnswer(answer: any) {
        console.log('收到 answer');
        let desc = new RTCSessionDescription(answer.sdp);
        this.connection?.setRemoteDescription(desc).catch(e => console.log('set remote desc error', e));
    }

    render() {
        const {info, peopleList} = this.props;
        const {playing} = this.state;

        return (
            <div className="video-panel-wrapper">
                {!playing && <Button type="primary" className="open-btn" onClick={this.handleOpenVideo}>开启视频</Button>}
                <video className="video-el" ref={this.videoRef} />
                {!playing && <div className="username">{info.name}</div>}

                <div className="other-list">
                    {peopleList.slice(0, 2).map((people, index) => {
                        return (
                            <div className="other-box" key={people.id} onClick={() => this.handleConnect(people.id)}>
                                <div className="other-name">{people.name}</div>
                                <video ref={this.otherVideoRefs[index]}></video>
                            </div>
                        );
                    })}
                    {peopleList.length >= 3 && (
                        <div className="etc-box">
                            ...
                        </div>
                    )}
                </div>
            </div>
        );
    }
}

export default VideoPanel;