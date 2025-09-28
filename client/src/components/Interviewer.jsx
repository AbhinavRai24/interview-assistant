import React, { useState } from 'react';
import { Table, Input, Button, Modal, Card } from 'antd';
import { useSelector } from 'react-redux';
import CandidateDetailModal from './CandidateDetailModal';

export default function Interviewer() {
    const candidates = useSelector(s => s.candidates.list || []);
    const [filter, setFilter] = useState('');
    const [selected, setSelected] = useState(null);

    const data = candidates.filter(c => {
        const q = filter.trim().toLowerCase();
        if (!q) return true;
        return (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q);
    }).map(c => ({ key: c.id, ...c }));

    const columns = [
        { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a, b) => (a.name || '').localeCompare(b.name || '') },
        { title: 'Email', dataIndex: 'email', key: 'email' },
        { title: 'Score', dataIndex: 'finalScore', key: 'finalScore', sorter: (a, b) => (b.finalScore || 0) - (a.finalScore || 0), render: v => v != null ? `${v}%` : '—' },
        { title: 'Status', dataIndex: 'status', key: 'status' },
        { title: 'Started', dataIndex: 'startedAt', key: 'startedAt', render: v => v ? new Date(v).toLocaleString() : '-' },
        {
            title: 'Actions', key: 'actions', render: (text, record) => (
                <Button onClick={() => setSelected(record)}>View</Button>
            )
        }
    ];

    return (
        <div>
            <Card style={{ marginBottom: 12 }}>
                <Input.Search placeholder="Search by name/email/phone" enterButton onSearch={setFilter} onChange={e => setFilter(e.target.value)} value={filter} />
            </Card>

            <Table columns={columns} dataSource={data} pagination={{ pageSize: 8 }} />

            <CandidateDetailModal candidate={selected} onClose={() => setSelected(null)} />
        </div>
    );
}