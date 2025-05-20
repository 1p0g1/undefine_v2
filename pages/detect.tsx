import React from 'react';

export async function getServerSideProps() {
  return { props: {} };
}

export default function DetectPage() {
  return <div>Detection trigger</div>;
} 