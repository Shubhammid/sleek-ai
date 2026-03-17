import { ChatStatus, UIMessage } from "ai";
import React from "react";
import { PromptInputMessage } from "../ai-elements/prompt-input";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "../ai-elements/conversation";
import ChatInput from "./chat-input";
import { Skeleton } from "../ui/skeleton";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "../ai-elements/message";
import {
  Attachment,
  AttachmentPreview,
  Attachments,
} from "../ai-elements/attachments";

type PropsType = {
  className?: string;
  input: string;
  isLoading: boolean;
  isProjectLoading?: boolean;
  setInput: (input: string) => void;
  messages: UIMessage[];
  error?: Error;
  onStop: () => void;
  onSubmit: (message: PromptInputMessage, options?: any) => void;
  status: ChatStatus;
};

const ChatPanel = ({
  className,
  input,
  isLoading,
  setInput,
  messages,
  onStop,
  onSubmit,
  status,
  error,
  isProjectLoading,
}: PropsType) => {
  return (
    <div className="relative flex flex-col flex-1 overflow-hidden">
      <Conversation className={className}>
        <ConversationContent>
          {isProjectLoading ? (
            <div className="flex flex-col gap-2 pt-2">
              <Skeleton className="w-full h-6" />
              <Skeleton className="w-3/4 h-4" />
              <Skeleton className="w-1/2 h-4" />
            </div>
          ) : messages.length === 0 ? (
            <ConversationEmptyState />
          ) : (
            messages?.map((message, msgIndex) => {
              const attachmentsFromMessage = message.parts.filter(
                (part) => part.type === "file",
              );
              return (
                <>
                  <Message from={message.role} key={message.id}>
                    <MessageContent className="text-[14.5px]">
                      {attachmentsFromMessage.length > 0 && (
                        <Attachments variant="grid">
                          {attachmentsFromMessage.map((part, i) => {
                            const id = `${message.id}-file-${i}`;
                            const attachmentData = { ...part, id };
                            return (
                              <Attachment
                                data={attachmentData}
                                key={id}
                                className="size-20 border-primary/10"
                              >
                                <AttachmentPreview />
                              </Attachment>
                            );
                          })}
                        </Attachments>
                      )}

                      {message.parts.map((part, i) => {
                        switch (part.type) {
                          case "text":
                            return (
                              <div
                                key={`${message.id}-text-${i}`}
                                className="flex items-start gap-2"
                              >
                                <MessageResponse>{part.text}</MessageResponse>
                              </div>
                            );
                          default:
                            return null;
                        }
                      })}
                    </MessageContent>
                  </Message>
                </>
              );
            })
          )}
        </ConversationContent>
      </Conversation>

      <div className="p-4 bg-background border-t">
        <ChatInput
          input={input}
          isLoading={isLoading}
          status={status}
          setInput={setInput}
          onStop={onStop}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
};

export default ChatPanel;
