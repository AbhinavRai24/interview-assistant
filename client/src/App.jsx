import React from 'react';
import { Tabs, Layout, Typography } from 'antd';
import Interviewee from './components/Interviewee';
import Interviewer from './components/Interviewer';

const { Title } = Typography;

export default function App() {
    return (
        <Layout style={{ padding: 20 }}>
            <Title level={3} style={{ textAlign: 'center' }}>AI Interview Assistant</Title>
            <Tabs defaultActiveKey="1" centered>
                <Tabs.TabPane tab="Interviewee (Chat)" key="1">
                    <Interviewee />
                </Tabs.TabPane>
                <Tabs.TabPane tab="Interviewer (Dashboard)" key="2">
                    <Interviewer />
                </Tabs.TabPane>
            </Tabs>
        </Layout>
    );
}