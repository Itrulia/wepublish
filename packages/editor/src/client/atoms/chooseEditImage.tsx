import React from 'react'
import {Dropdown, Icon, IconButton, Panel, Placeholder} from 'rsuite'
import {PlaceholderInput} from './placeholderInput'
import {useTranslation} from 'react-i18next'

export interface ChooseEditImageProps {
  image: any
  header?: string
  disabled: boolean
  left?: number
  top?: number
  openChooseModalOpen?: () => void
  openEditModalOpen?: () => void
  removeImage?: () => void
}

export function ChooseEditImage({
  image,
  header,
  disabled,
  left,
  top,
  openChooseModalOpen,
  openEditModalOpen,
  removeImage
}: ChooseEditImageProps): JSX.Element {
  const {t} = useTranslation()
  header = header ?? t('chooseEditImage.header')
  return (
    <Panel header={header} bodyFill={true}>
      {!image && disabled === true && <Placeholder.Graph />}
      <PlaceholderInput onAddClick={() => openChooseModalOpen?.()}>
        {image && (
          <div
            style={{
              maxHeight: '240',
              display: 'flex',
              justifyContent: 'center',
              position: 'relative'
            }}>
            <img
              src={image?.largeURL ?? '/static/placeholder-240x240.png'}
              style={{objectFit: 'contain'}}
            />
            {(openChooseModalOpen || openEditModalOpen || removeImage) && (
              <div style={{position: 'absolute', left: left, top: top}}>
                <Dropdown
                  renderTitle={() => {
                    return <IconButton appearance="primary" icon={<Icon icon="wrench" />} circle />
                  }}>
                  {openChooseModalOpen && (
                    <Dropdown.Item disabled={disabled} onClick={() => openChooseModalOpen()}>
                      <Icon icon="image" /> {t('chooseEditImage.chooseImage')}
                    </Dropdown.Item>
                  )}
                  {openEditModalOpen && (
                    <Dropdown.Item disabled={disabled} onClick={() => openEditModalOpen()}>
                      <Icon icon="pencil" /> {t('chooseEditImage.editImage')}
                    </Dropdown.Item>
                  )}
                  {removeImage && (
                    <Dropdown.Item disabled={disabled} onClick={() => removeImage()}>
                      <Icon icon="close" /> {t('chooseEditImage.removeImage')}
                    </Dropdown.Item>
                  )}
                </Dropdown>
              </div>
            )}
          </div>
        )}
      </PlaceholderInput>
    </Panel>
  )
}
