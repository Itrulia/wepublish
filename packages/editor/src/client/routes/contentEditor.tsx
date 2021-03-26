import React, {useState, useEffect, useCallback} from 'react'
import {Drawer, Modal, Notification, Icon, IconButton} from 'rsuite'
import {EditorTemplate} from '../atoms/editorTemplate'
import {NavigationBar} from '../atoms/navigationBar'
import {RouteActionType} from '@karma.run/react'

import {
  useRouteDispatch,
  IconButtonLink,
  ContentListRoute,
  useRoute,
  ContentEditRoute
} from '../route'

import {ContentMetadata, CustomContentMetadataPanel} from '../panel/contentMetadataPanel'
import {usePublishContentMutation} from '../api'
import {useUnsavedChangesDialog} from '../unsavedChangesDialog'
import {useTranslation} from 'react-i18next'
import {PublishCustomContentPanel} from '../panel/contentPublishPanel'
import {useMutation, useQuery} from '@apollo/client'
import {getCreateMutation, getUpdateMutation, getReadQuery} from '../utils/queryUtils'
import {ConfigMerged} from '../interfaces/extensionConfig'

export interface ArticleEditorProps {
  readonly id?: string
  readonly contentTypeList: ConfigMerged
}

interface ContentBody {
  id: string
  createdAt: Date
  modifiedAt: Date
  publicationDate?: Date
  dePublicationDate?: Date
  revision: number
  shared: boolean
  state: string
  title: string
  content: any
  __typename: string
}

export function ContentEditor({id, contentTypeList}: ArticleEditorProps) {
  const {t} = useTranslation()
  const {current} = useRoute()
  const dispatch = useRouteDispatch()
  const type = (current?.params as any).type || ''

  const cusomContentConfig = contentTypeList.contentModelExtension.find(config => {
    return config.identifier === type
  })
  if (!cusomContentConfig) {
    throw Error(`Content type ${type} not supported`)
  }

  const [createContent, {loading: isCreating, data: createData, error: createError}] = useMutation(
    getCreateMutation(cusomContentConfig)
  )

  const [updateContent, {loading: isUpdating, error: updateError}] = useMutation(
    getUpdateMutation(cusomContentConfig)
  )

  const [publishContent, {loading: isPublishing, error: publishError}] = usePublishContentMutation({
    fetchPolicy: 'no-cache'
  })

  const [isMetaDrawerOpen, setMetaDrawerOpen] = useState(false)
  const [isPublishDialogOpen, setPublishDialogOpen] = useState(false)

  const [publishedAt, setPublishedAt] = useState<Date>()
  const [metadata, setMetadata] = useState<ContentMetadata>({
    title: '',
    shared: false
  })

  const isNew = id === undefined
  const [contentData, setContentData] = useState<any>(cusomContentConfig.defaultContent ?? null)
  const contentdId = id || createData?.content[type].create.id

  const {data, loading: isLoading} = useQuery(getReadQuery(cusomContentConfig), {
    skip: isNew || createData != null,
    errorPolicy: 'all',
    fetchPolicy: 'no-cache',
    variables: {id: contentdId!}
  })

  const isNotFound = data && !data.content
  const recordData: ContentBody = data?.content[type].read

  const isDisabled = isLoading || isCreating || isUpdating || isPublishing || isNotFound
  const pendingPublishDate = recordData?.createdAt

  const [hasChanged, setChanged] = useState(false)
  const unsavedChangesDialog = useUnsavedChangesDialog(hasChanged)

  const handleChange = useCallback(
    (contentData: React.SetStateAction<any>) => {
      setContentData(contentData)
      setChanged(true)
    },
    [id]
  )

  useEffect(() => {
    if (recordData) {
      const {shared, title, content} = recordData
      const publishedAt = new Date()
      if (publishedAt) setPublishedAt(new Date(publishedAt))

      setMetadata({
        title,
        shared
      })
      setContentData(content)
    }
  }, [data])

  useEffect(() => {
    if (createError || updateError || publishError) {
      Notification.error({
        title: updateError?.message ?? createError?.message ?? publishError!.message,
        duration: 5000
      })
    }
  }, [createError, updateError, publishError])

  function createInput(): any {
    let {__typename, ...content} = contentData
    if (cusomContentConfig?.mapStateToInput) {
      content = cusomContentConfig.mapStateToInput(content)
    }

    return {
      id: contentdId,
      title: metadata.title,
      shared: metadata.shared,
      content
    }
  }

  async function handleSave() {
    const input = createInput()
    if (contentdId) {
      await updateContent({variables: {input}})

      setChanged(false)
      Notification.success({
        title: t('articleEditor.overview.draftSaved'),
        duration: 2000
      })
    } else {
      const {data} = await createContent({variables: {input}})

      if (data) {
        dispatch({
          type: RouteActionType.ReplaceRoute,
          route: ContentEditRoute.create({type, id: data.content[type].create.id})
        })
      }
      setChanged(false)
      Notification.success({
        title: t('articleEditor.overview.draftCreated'),
        duration: 2000
      })
    }
  }

  async function handlePublish(publishDate: Date, updateDate: Date) {
    if (contentdId) {
      const {data} = await updateContent({
        variables: {id: contentdId, input: createInput()}
      })

      if (data) {
        const {data: publishData} = await publishContent({
          variables: {
            id: contentdId,
            publishAt: publishDate.toISOString(),
            publishedAt: publishDate.toISOString(),
            updatedAt: updateDate.toISOString()
          }
        })

        if (publishData?.content?._all?.publish?.published?.publishedAt) {
          setPublishedAt(new Date(publishData?.content?._all?.publish?.published.publishedAt))
        }
      }

      setChanged(false)
      Notification.success({
        title: t('articleEditor.overview.articlePublished'),
        duration: 2000
      })
    }
  }

  useEffect(() => {
    if (isNotFound) {
      Notification.error({
        title: t('articleEditor.overview.notFound'),
        duration: 5000
      })
    }
  }, [isNotFound])

  let content = null
  if (cusomContentConfig.getContentView) {
    content = cusomContentConfig.getContentView(contentData, handleChange, isLoading || isDisabled)
  }

  let drawer = null
  if (cusomContentConfig.getMetaView) {
    drawer = (
      <Drawer show={isMetaDrawerOpen} size={'sm'} onHide={() => setMetaDrawerOpen(false)}>
        {cusomContentConfig.getMetaView(
          metadata,
          () => setMetaDrawerOpen(false),
          (value: any) => {
            setMetadata(value)
            setChanged(true)
          }
        )}
      </Drawer>
    )
  } else {
    drawer = (
      <Drawer show={isMetaDrawerOpen} size={'sm'} onHide={() => setMetaDrawerOpen(false)}>
        <CustomContentMetadataPanel
          value={metadata}
          onClose={() => setMetaDrawerOpen(false)}
          onChange={(value: any) => {
            setMetadata(value)
            setChanged(true)
          }}
        />
      </Drawer>
    )
  }

  return (
    <>
      <EditorTemplate
        navigationChildren={
          <NavigationBar
            leftChildren={
              <IconButtonLink
                size={'lg'}
                icon={<Icon icon="arrow-left" />}
                route={ContentListRoute.create({type})}
                onClick={e => {
                  if (!unsavedChangesDialog()) e.preventDefault()
                }}>
                {t('articleEditor.overview.back')}
              </IconButtonLink>
            }
            centerChildren={
              <>
                {drawer ? (
                  <IconButton
                    icon={<Icon icon="newspaper-o" />}
                    size={'lg'}
                    disabled={isDisabled}
                    onClick={() => setMetaDrawerOpen(true)}>
                    {t('articleEditor.overview.metadata')}
                  </IconButton>
                ) : null}

                {isNew && createData == null ? (
                  <IconButton
                    style={{
                      marginLeft: '10px'
                    }}
                    size={'lg'}
                    icon={<Icon icon="save" />}
                    disabled={isDisabled}
                    onClick={() => handleSave()}>
                    {t('articleEditor.overview.create')}
                  </IconButton>
                ) : (
                  <>
                    <IconButton
                      style={{
                        marginLeft: '10px'
                      }}
                      size={'lg'}
                      icon={<Icon icon="save" />}
                      disabled={isDisabled}
                      onClick={() => handleSave()}>
                      {t('articleEditor.overview.save')}
                    </IconButton>
                    <IconButton
                      style={{
                        marginLeft: '10px'
                      }}
                      size={'lg'}
                      icon={<Icon icon="cloud-upload" />}
                      disabled={isDisabled}
                      onClick={() => setPublishDialogOpen(true)}>
                      {t('articleEditor.overview.publish')}
                    </IconButton>
                  </>
                )}
              </>
            }
          />
        }>
        {content}
      </EditorTemplate>
      {drawer}
      <Modal show={isPublishDialogOpen} size={'sm'} onHide={() => setPublishDialogOpen(false)}>
        <PublishCustomContentPanel
          initialPublishDate={publishedAt}
          pendingPublishDate={pendingPublishDate}
          metadata={metadata}
          onClose={() => setPublishDialogOpen(false)}
          onConfirm={(publishDate, updateDate) => {
            handlePublish(publishDate, updateDate)
            setPublishDialogOpen(false)
          }}
        />
      </Modal>
    </>
  )
}