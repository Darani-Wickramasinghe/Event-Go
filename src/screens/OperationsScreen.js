import { useState } from 'react';
import { Action, Choices, Copy, Field, Page, Panel } from '../components/FlowUI';

export function ReportScreen({ event, onBack, onSubmit }) {
  const [category, setCategory] = useState('Misleading details');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  return (
    <Page title="Report event" onBack={onBack}>
      <Panel title={event.title}>
        {submitted && <Copy>Report saved on this device.</Copy>}
      </Panel>
      {submitted ? <Action label="Return to event" onPress={onBack} /> : (
        <>
          <Choices label="Reason" options={['Misleading details', 'Inappropriate content', 'Suspected fraud']} selected={[category]} onSelect={setCategory} />
          <Field label="Details (optional)" value={note} onChangeText={setNote} multiline maxLength={500} />
          <Action label="Submit report" onPress={() => { onSubmit(category, note.trim()); setSubmitted(true); }} />
        </>
      )}
    </Page>
  );
}
