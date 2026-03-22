import ChatInterface from '@/components/chat'
import React, { Suspense } from 'react'

const Page = async ({ params }: {
  params: Promise<{ slugId: string }>
}) => {
  const { slugId } = await params;
  return (
    <div>
      <Suspense fallback={<div>Loading project...</div>}>
        <ChatInterface
          key={slugId}
          isProjectPage={true}
          slugId={slugId}
        />
      </Suspense>
    </div>
  )
}

export default Page