"use client";

import { useChat } from "@ai-sdk/react";
import { generateSlugId } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DefaultChatTransport } from "ai";
import { toast } from "sonner";
import { PromptInputMessage } from "../ai-elements/prompt-input";
import NewProjectChat from "./new-project-chat";
import { Button } from "../ui/button";
import { ArrowLeft } from "lucide-react";
import ChatPanel from "./chat-panel";
import Canvas from "./canvas";

type PropsType = {
  isProjectPage?: boolean;
  slugId?: string;
};

const ChatInterface = ({
  isProjectPage = false,
  slugId: propSlugId,
}: PropsType) => {
  const pathname = usePathname();
  const router = useRouter();

  const [slugId, setSlugId] = useState(() => propSlugId || generateSlugId());

  const [input, setInput] = useState("");
  const [hasStarted, setHasStarted] = useState(isProjectPage);
  const [projectTitle, setProjectTitle] = useState<string | null>(null);

  const { messages, sendMessage, setMessages, status, error, stop } = useChat({
    messages: [],
    transport: new DefaultChatTransport({
      api: "/api/project",
      prepareSendMessagesRequest: ({ messages, body }) => {
        return {
          body: {
            ...body,
            messages,
          },
        };
      },
    }),
    onData(dataPart) {
      const part = dataPart as any;
      const data = part.data;
    },
    onError: (error) => {
      console.log(error);
      toast.error("Failed to generate response");
    },
  });

  useEffect(() => {
    const checkReset = () => {
      if (window.location.pathname === "/" && (hasStarted || isProjectPage)) {
        setSlugId(generateSlugId());
        setMessages([]);
        setHasStarted(false);
        setProjectTitle(null);
      }
    };

    window.addEventListener("popstate", checkReset);

    if (pathname === "/" && hasStarted) {
      checkReset();
    }

    return () => window.removeEventListener("popstate", checkReset);
  }, [pathname, hasStarted, isProjectPage, setMessages]);

  const isLoading = status === "submitted" || status === "streaming";

  const onSubmit = async (message: PromptInputMessage, options: any = {}) => {
    if (!message.text.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (!isProjectPage && !hasStarted) {
      window.history.pushState(null, "", `/project/${slugId}`);
      setHasStarted(true);
    }

    sendMessage(
      {
        text: message.text,
        files: message.files,
      },
      {
        body: {
          ...options,
          slugId,
        },
      },
    );

    setInput("");
  };

  const handleBack = () => {
    if (!isProjectPage) {
      setSlugId(generateSlugId());
      setHasStarted(false);
      setMessages([]);
      setProjectTitle(null);
    }
    router.push("/");
  };

  if (!isProjectPage && !hasStarted) {
    return (
      <NewProjectChat
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        status={status}
        onStop={stop}
        onSubmit={onSubmit}
      />
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="flex relative w-full max-w-md border-r border-border">
        <div className="w-full absolute left-0 top-0 z-10 pb-2 bg-background">
          <div
            role="button"
            className="flex items-center gap-2 cursor-pointer!"
            onClick={handleBack}
          >
            <Button variant="secondary" size="icon">
              <ArrowLeft />
            </Button>
            <h5 className="font-semibold tracking-tight truncate pr-4">
              {projectTitle || "Untitled Project"}
            </h5>
          </div>
        </div>

        <ChatPanel
          className="h-full pt-8"
          messages={messages}
          input={input}
          setInput={setInput}
          isLoading={isLoading}
          status={status}
          error={error}
          onStop={stop}
          onSubmit={onSubmit}
        />
      </div>
      <div className="flex-1">
        <Canvas />
      </div>
    </div>
  );
};

export default ChatInterface;
