import { useCallback, useEffect, useRef, useState } from "react";
import { observer } from "mobx-react";
import { useSearchParams } from "next/navigation";
// editor
import { EditorRefApi } from "@plane/editor";
// types
import { TDocumentPayload, TPage, TPageVersion, TWebhookConnectionQueryParams } from "@plane/types";
// components
import {
  PageEditorToolbarRoot,
  PageEditorBody,
  PageVersionsOverlay,
  PagesVersionEditor,
  TEditorBodyHandlers,
  TEditorBodyConfig,
} from "@/components/pages";
// hooks
import { useAppRouter } from "@/hooks/use-app-router";
import { usePageFallback } from "@/hooks/use-page-fallback";
import { useQueryParams } from "@/hooks/use-query-params";
// store
import { TPageInstance } from "@/store/pages/base-page";

export type TPageRootHandlers = {
  create: (payload: Partial<TPage>) => Promise<Partial<TPage> | undefined>;
  fetchAllVersions: (pageId: string) => Promise<TPageVersion[] | undefined>;
  fetchDescriptionBinary: () => Promise<any>;
  fetchVersionDetails: (pageId: string, versionId: string) => Promise<TPageVersion | undefined>;
  getRedirectionLink: (pageId: string) => string;
  updateDescription: (document: TDocumentPayload) => Promise<void>;
} & TEditorBodyHandlers;

export type TPageRootConfig = TEditorBodyConfig;

type TPageRootProps = {
  config: TPageRootConfig;
  handlers: TPageRootHandlers;
  page: TPageInstance;
  webhookConnectionParams: TWebhookConnectionQueryParams;
  workspaceSlug: string;
};

export const PageRoot = observer((props: TPageRootProps) => {
  const { config, handlers, page, webhookConnectionParams, workspaceSlug } = props;
  // states
  const [editorReady, setEditorReady] = useState(false);
  const [hasConnectionFailed, setHasConnectionFailed] = useState(false);
  const [isVersionsOverlayOpen, setIsVersionsOverlayOpen] = useState(false);
  // refs
  const editorRef = useRef<EditorRefApi>(null);
  // router
  const router = useAppRouter();
  // search params
  const searchParams = useSearchParams();
  // derived values
  const { isContentEditable, setEditorRef } = page;
  // page fallback
  usePageFallback({
    editorRef,
    fetchPageDescription: handlers.fetchDescriptionBinary,
    hasConnectionFailed,
    updatePageDescription: handlers.updateDescription,
  });
  // update query params
  const { updateQueryParams } = useQueryParams();

  const handleEditorReady = useCallback(
    (status: boolean) => {
      setEditorReady(status);
      if (editorRef.current && !page.editorRef) {
        setEditorRef(editorRef.current);
      }
    },
    [page.editorRef, setEditorRef]
  );

  useEffect(() => {
    setTimeout(() => {
      setEditorRef(editorRef.current);
    }, 0);
  }, [isContentEditable, setEditorRef]);

  const version = searchParams.get("version");
  useEffect(() => {
    if (!version) {
      setIsVersionsOverlayOpen(false);
      return;
    }
    setIsVersionsOverlayOpen(true);
  }, [version]);

  const handleCloseVersionsOverlay = () => {
    const updatedRoute = updateQueryParams({
      paramsToRemove: ["version"],
    });
    router.push(updatedRoute);
  };

  const handleRestoreVersion = async (descriptionHTML: string) => {
    editorRef.current?.clearEditor();
    editorRef.current?.setEditorValue(descriptionHTML);
  };
  const currentVersionDescription = editorRef.current?.getDocument().html;

  // reset editor ref on unmount
  useEffect(
    () => () => {
      setEditorRef(null);
    },
    [setEditorRef]
  );

  return (
    <>
      <PageVersionsOverlay
        activeVersion={version}
        currentVersionDescription={currentVersionDescription ?? null}
        editorComponent={PagesVersionEditor}
        fetchAllVersions={handlers.fetchAllVersions}
        fetchVersionDetails={handlers.fetchVersionDetails}
        handleRestore={handleRestoreVersion}
        isOpen={isVersionsOverlayOpen}
        onClose={handleCloseVersionsOverlay}
        pageId={page.id ?? ""}
        restoreEnabled={isContentEditable}
      />
      <PageEditorToolbarRoot page={page} />
      <PageEditorBody
        config={config}
        editorReady={editorReady}
        editorForwardRef={editorRef}
        handleConnectionStatus={setHasConnectionFailed}
        handleEditorReady={handleEditorReady}
        handlers={handlers}
        page={page}
        webhookConnectionParams={webhookConnectionParams}
        workspaceSlug={workspaceSlug}
      />
    </>
  );
});
