import React from 'react';
import { Modal, Button, StepProgress, OptionCard } from '../components';

export interface AccountSetupModalProps {
  open?: boolean;
  onClose?: () => void;
  onContinue?: () => void;
  /** 860 on desktop, 330 on mobile */
  width?: number;
  /** gap between option cards — wider on desktop */
  gap?: string;
  /** constrain the option column on desktop */
  maxWidth?: number;
}

const OPTIONS = [
  {
    id: 'orders',
    icon: 'wallet',
    title: 'Find Orders Manually',
    description: 'Manual Orders With Allow You To Analyze Every Order In More Details.',
  },
  {
    id: 'carriers',
    icon: 'truck',
    title: 'Add New Carriers',
    description: 'New Carriers Increase Orders Circulation And The Number Of Deals.',
  },
  {
    id: 'auto',
    icon: 'audio-lines',
    title: 'Create Automation',
    description: 'Automated Campaigns Save Your Time In Making Super-Fast Deals',
  },
];

/**
 * "Account Set Up" — the onboarding modal from the source material.
 * Step 7 of 8, three mutually exclusive option cards, Skip / Continue.
 */
export function AccountSetupModal({
  open,
  onClose,
  onContinue,
  width = 860,
  gap = 'var(--sp-8)',
  maxWidth = 520,
}: AccountSetupModalProps) {
  const [pick, setPick] = React.useState('carriers');

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={width}
      header={
        <StepProgress
          step={7}
          total={8}
          title="Account Set Up"
          subtitle="What Do You Want To Do First?"
        />
      }
      footer={
        <>
          <Button variant="secondary" size="lg" fullWidth onClick={onClose}>
            Skip
          </Button>
          <Button variant="primary" size="lg" fullWidth onClick={onContinue}>
            Continue
          </Button>
        </>
      }
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap,
          maxWidth,
          margin: '0 auto',
        }}
      >
        {OPTIONS.map((o) => (
          <OptionCard
            key={o.id}
            icon={o.icon}
            title={o.title}
            description={o.description}
            selected={pick === o.id}
            onClick={() => setPick(o.id)}
          />
        ))}
      </div>
    </Modal>
  );
}
