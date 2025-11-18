import React from 'react';

interface FlashIconProps extends React.SVGProps<SVGSVGElement> {
  on: boolean;
}

export const FlashIcon: React.FC<FlashIconProps> = ({ on, ...props }) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
      {!on && (
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15" />
      )}
    </svg>
  );
};
