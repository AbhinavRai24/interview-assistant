import React from 'react';
import { Modal, List, Tag } from 'antd';

export default function CandidateDetailModal({ candidate, onClose }) {
    if (!candidate) return null;
    return (
        <Modal open={!!candidate} title={`${candidate.name || 'Candidate'} - Details`} onCancel={onClose} footer={null} width={800}>
            <p><b>Email:</b> {candidate.email}</p>
            <p><b>Phone:</b> {candidate.phone}</p>
            <p><b>Final Score:</b> {candidate.finalScore || '—'}</p>
            <p><b>Summary:</b> {candidate.summary || '—'}</p>

            <h4>Questions</h4>
            <List
                dataSource={candidate.questions || []}
                renderItem={(q, i) => (
                    <List.Item key={i}>
                        <div style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div><b>Q{i + 1} ({q.difficulty})</b>: {q.text}</div>
                                <div>
                                    {q.score != null ? <Tag color="green">Score: {q.score}</Tag> : <Tag>Not graded</Tag>}
                                </div>
                            </div>
                            <div style={{ marginTop: 8 }}>
                                <b>Answer:</b> {q.answerText || '—'}
                            </div>
                            <div style={{ marginTop: 4 }}>
                                <b>Feedback:</b> {q.feedback || '—'}
                            </div>
                        </div>
                    </List.Item>
                )}
            />
        </Modal>
    );
}