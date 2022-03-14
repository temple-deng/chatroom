
import React, { useState } from 'react';
import {People, Message, SendMsg} from '../../type';
import cn from 'classnames';
import './index.less';
import {Input, Select, Button} from 'antd';

type Props = {
    info: People,
    peopleList: People[];
    messages: Message[];
    onSend: (msg: SendMsg) => void;
}

export default function Chatroom(props: Props) {
    const {peopleList, info, messages} = props;
    const opts = peopleList.map(p => ({label: p.name, value: p.id}))
    const options = [{
        label: '全体',
        value: -1,
    }].concat(opts);

    const [input, setInput] = useState('');
    const [selectId, setSelectId] = useState(-1);

    const handleMsgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    }
    const handlePeopleChange = (val: number) => {
        setSelectId(val);
    }

    const handleSend = () => {
        if (input.trim().length) {
            props.onSend({msg: input, id: selectId});
            setInput('');
        }
    }

    return (
        <div className="chatroom-wrapper">
            <div className="room-info">
                当前在线人数：<span className="people-num">{peopleList.length + 1}</span>
            </div>

            <div className="message-list">
                {messages.map(msgItem => {
                    const {type, id, name, msg} = msgItem;
                    const cls = cn('message', `${type}`);
                    let msgSource;
                    switch (type) {
                        case 'self':
                            msgSource = '我';
                            break;
                        case 'system':
                            msgSource = '系统';
                            break;
                        case 'public':
                            msgSource = name;
                            break
                    }

                    return (
                        <div className={cls} key={id}>
                            {msgSource}: {msg}
                        </div>
                    );
                })}
            </div>

            <div className="input-line">
                <Input placeholder="发言" onChange={handleMsgChange} value={input} />
                <Select options={options} onChange={handlePeopleChange} value={selectId} style={{width: 200}} />
                <Button onClick={handleSend}>发送</Button>
            </div>
        </div>
    );
}