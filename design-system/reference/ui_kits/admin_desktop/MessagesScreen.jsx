const { Card, Avatar, Tag, IconButton, ChatListItem, MessageBubble, MessageComposer } = window.MySystemLifeDesignSystem_265e57 || {};

function Eyebrow({ icon, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: 'var(--sp-6) var(--sp-8)',
      font: 'var(--type-body)', color: 'var(--text-subtle)',
      borderBottom: '1px solid var(--border-hairline)',
    }}>{children}</div>
  );
}

function MessagesScreen() {
  const D = window.MSL_DATA;
  const [activeId, setActiveId] = React.useState('c1');
  const [draft, setDraft] = React.useState('');
  const [thread, setThread] = React.useState(D.thread);
  const active = D.chats.find(c => c.id === activeId) || D.chats[0];

  const send = text => {
    setThread(t => [...t, { own: true, time: 'Now', read: false, text }]);
    setDraft('');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px minmax(0,1fr)', gap: 'var(--card-gap)', alignItems: 'stretch', minHeight: 0 }}>
      <Card flush style={{ minHeight: 0 }} bodyStyle={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'var(--card-pad-lg)', borderBottom: '1px solid var(--border-hairline)',
        }}>
          <h3 style={{ font: 'var(--type-page-title)', color: 'var(--text-heading)' }}>All Chat</h3>
          <div style={{ display: 'flex', gap: 'var(--sp-4)' }}>
            <IconButton icon="square-pen" label="New chat" size={34} />
            <IconButton icon="search" label="Search chats" size={34} />
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <Eyebrow>◍ Pinned Message</Eyebrow>
          {D.chats.filter(c => c.pinned).map(c => (
            <ChatListItem key={c.id} {...c} active={c.id === activeId} onClick={() => setActiveId(c.id)} />
          ))}
          <Eyebrow>◍ All Message</Eyebrow>
          {D.chats.filter(c => !c.pinned).map(c => (
            <ChatListItem key={c.id} {...c} active={c.id === activeId} onClick={() => setActiveId(c.id)} />
          ))}
        </div>
      </Card>

      <Card flush style={{ minHeight: 0 }} bodyStyle={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-9)',
          padding: 'var(--sp-8) var(--card-pad-lg)', borderBottom: '1px solid var(--border-hairline)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-6)', minWidth: 0 }}>
            <Avatar name={active.name} size={40} />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-5)' }}>
                <span style={{ font: 'var(--fw-medium) var(--fs-lg)/1.2 var(--font-core)', color: 'var(--text-heading)' }}>{active.name}</span>
                <Tag tone={active.role === 'Driver' ? 'driver' : 'role'}>{active.role}</Tag>
              </div>
              <span style={{ font: 'var(--type-body)', color: 'var(--text-muted)' }}>PSP Cargo Group</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--sp-5)' }}>
            <IconButton icon="phone" label="Call" size={38} />
            <IconButton icon="video" label="Video call" size={38} />
            <IconButton icon="message-circle" label="Thread options" size={38} />
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--sp-9)', padding: 'var(--card-pad-lg)' }}>
          <span style={{
            alignSelf: 'center', padding: '6px 16px', borderRadius: 'var(--r-pill)',
            background: 'var(--surface-raised)', font: 'var(--type-body)', color: 'var(--text-muted)',
          }}>Today, Dec 25</span>
          {thread.map((m, i) => (
            <MessageBubble key={i} own={m.own} author={m.author} time={m.time} read={m.read}
              quote={m.quote} attachment={m.attachment}>{m.text}</MessageBubble>
          ))}
        </div>
        <div style={{ padding: 'var(--card-pad-lg)', borderTop: '1px solid var(--border-hairline)' }}>
          <MessageComposer value={draft} onChange={setDraft} onSend={send} />
        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { MessagesScreen });
