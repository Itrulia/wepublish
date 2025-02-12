import React, {useState, useEffect} from 'react'

import {Button, Checkbox, Message, Modal} from 'rsuite'

import {DescriptionList, DescriptionListItem} from '../atoms/descriptionList'

import {PageMetadata} from './pageMetadataPanel'

import {useTranslation} from 'react-i18next'
import {DateTimePicker} from '../atoms/dateTimePicker'
import {InfoColor} from '../atoms/infoMessage'
import {DescriptionListItemWithMessage} from '../atoms/descriptionListwithMessage'

export interface PublishPagePanelProps {
  publishedAtDate?: Date
  updatedAtDate?: Date
  publishAtDate?: Date
  pendingPublishDate?: Date
  metadata: PageMetadata

  onClose(): void
  onConfirm(publishedAt: Date, publishAt: Date, updatedAt?: Date): void
}

export function PublishPagePanel({
  publishedAtDate,
  updatedAtDate,
  publishAtDate,
  pendingPublishDate,
  metadata,
  onClose,
  onConfirm
}: PublishPagePanelProps) {
  const now = new Date()

  const [publishedAt, setPublishedAt] = useState<Date | undefined>(publishedAtDate ?? now)

  const [publishAt, setPublishAt] = useState<Date | undefined>(publishAtDate ?? undefined)

  const [updatedAt, setUpdatedAt] = useState<Date | undefined>(
    updatedAtDate?.getTime() === publishedAtDate?.getTime() ? undefined : updatedAtDate
  )

  const [isPublishDateActive, setIsPublishDateActive] = useState<boolean>(
    !(publishedAt?.getTime() === publishAt?.getTime() || !publishAt) ?? false
  )

  const {t} = useTranslation()

  useEffect(() => {
    if (!publishAt || !isPublishDateActive) {
      setPublishAt(publishedAt)
    }
  }, [isPublishDateActive, publishedAt])

  return (
    <>
      <Modal.Header>
        <Modal.Title>{t('pageEditor.panels.publishPage')}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {pendingPublishDate && (
          <Message
            type="warning"
            description={t('pageEditor.panels.pagePending', {pendingPublishDate})}
          />
        )}
        <DateTimePicker
          dateTime={publishedAt}
          label={t('pageEditor.panels.publishDate')}
          changeDate={date => setPublishedAt(date)}
        />
        <DateTimePicker
          dateTime={updatedAt}
          label={t('pageEditor.panels.updateDate')}
          changeDate={date => setUpdatedAt(date)}
        />
        {updatedAt && publishedAt && updatedAt < publishedAt ? (
          <Message type="warning" description={t('pageEditor.panels.updateDateWarning')}></Message>
        ) : (
          ''
        )}

        <Checkbox
          value={isPublishDateActive}
          checked={isPublishDateActive}
          onChange={isPublishDateActive => setIsPublishDateActive(!isPublishDateActive)}>
          {' '}
          {t('pageEditor.panels.publishAtDateCheckbox')}
        </Checkbox>

        {isPublishDateActive ? (
          <DateTimePicker
            disabled={!isPublishDateActive}
            dateTime={!isPublishDateActive ? undefined : publishAt}
            label={t('pageEditor.panels.publishAt')}
            changeDate={date => {
              setPublishAt(date)
            }}
            helpInfo={t('pageEditor.panels.dateExplanationPopOver')}
          />
        ) : (
          ''
        )}

        <DescriptionList>
          <DescriptionListItem label={t('pageEditor.panels.url')}>
            {metadata?.url ? (
              <a href={metadata.url} target="_blank" rel="noopener noreferrer">
                {metadata.url}
              </a>
            ) : (
              '-'
            )}
          </DescriptionListItem>
          <DescriptionListItemWithMessage
            label={t('pageEditor.panels.title')}
            message={t('pageEditor.panels.enterTitle')}
            messageType={InfoColor.warning}>
            {metadata.title}
          </DescriptionListItemWithMessage>

          <DescriptionListItemWithMessage
            label={t('pageEditor.panels.description')}
            message={t('pageEditor.panels.enterDescription')}
            messageType={InfoColor.warning}>
            {metadata.description}
          </DescriptionListItemWithMessage>

          <DescriptionListItem label={t('pageEditor.panels.slug')}>
            {metadata.slug || '-'}
          </DescriptionListItem>

          <DescriptionListItem label={t('pageEditor.panels.tags')}>
            {metadata.tags.join(', ') || '-'}
          </DescriptionListItem>

          <DescriptionListItemWithMessage
            label={t('pageEditor.panels.image')}
            message={t('pageEditor.panels.enterImage')}
            messageType={InfoColor.warning}>
            {metadata.image?.filename}
          </DescriptionListItemWithMessage>

          <DescriptionListItemWithMessage
            label={t('pageEditor.panels.socialMediaTitle')}
            message={t('pageEditor.panels.enterSocialMediaTitle')}
            messageType={InfoColor.warning}>
            {metadata.socialMediaTitle}
          </DescriptionListItemWithMessage>

          <DescriptionListItemWithMessage
            label={t('pageEditor.panels.socialMediaDescription')}
            message={t('pageEditor.panels.enterSocialMediaDescription')}
            messageType={InfoColor.warning}>
            {metadata.socialMediaDescription}
          </DescriptionListItemWithMessage>

          <DescriptionListItemWithMessage
            label={t('pageEditor.panels.socialMediaImage')}
            message={t('pageEditor.panels.enterSocialMediaDescription')}
            messageType={InfoColor.warning}>
            {metadata.socialMediaImage?.filename}
          </DescriptionListItemWithMessage>
        </DescriptionList>
      </Modal.Body>

      <Modal.Footer>
        <Button
          appearance="primary"
          disabled={!publishedAt || (updatedAt && updatedAt < publishedAt)}
          onClick={() => onConfirm(publishedAt!, publishAt!, updatedAt)}>
          {t('pageEditor.panels.confirm')}
        </Button>
        <Button appearance="subtle" onClick={() => onClose()}>
          {t('pageEditor.panels.close')}
        </Button>
      </Modal.Footer>
    </>
  )
}
