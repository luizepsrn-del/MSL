One chat message. Purple + right for own, raised surface + left for received.

```jsx
<MessageBubble own read time="09:44 PM">Sounds perfect. I will drop a message to Nick regarding changes.</MessageBubble>
<MessageBubble own quote={{ author: 'Mate Bruney', text: 'Wa he insist on this date?' }}>I'm afraid, yes, he wille</MessageBubble>
<MessageBubble author="Harrold Tafoya" time="09:44 PM" attachment={{ name: "I'm Invoice Ceva Bahn 21032023", kind: 'PDF' }} />
```

Pass `ownLabel` to rename the sender on your own messages; the default is English. Separate days with a centred pill reading "Today, Dec 25".
