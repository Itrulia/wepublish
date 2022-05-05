import React, {useEffect, useState} from 'react'

import {Button, Drawer, Form, Input, Message, Nav, Panel, TagPicker, Toggle} from 'rsuite'

import {ImagedEditPanel} from './imageEditPanel'
import {ImageSelectPanel} from './imageSelectPanel'
import {ImageRefFragment} from '../api'
import {MetaDataType} from '../blocks/types'

import {useTranslation} from 'react-i18next'
import {ChooseEditImage} from '../atoms/chooseEditImage'
import {ListInput, ListValue} from '../atoms/listInput'
import {generateID} from '../utility'
import CogIcon from '@rsuite/icons/legacy/Cog'
import ShareAltIcon from '@rsuite/icons/legacy/ShareAlt'
import ListIcon from '@rsuite/icons/legacy/List'

export interface PageMetadataProperty {
  readonly key: string
  readonly value: string
  readonly public: boolean
}

export interface PageMetadata {
  readonly slug: string
  readonly title: string
  readonly description: string
  readonly tags: string[]
  readonly url: string
  readonly properties: PageMetadataProperty[]
  readonly image?: ImageRefFragment
  readonly socialMediaTitle?: string
  readonly socialMediaDescription?: string
  readonly socialMediaImage?: ImageRefFragment
}

export interface PageMetadataPanelProps {
  readonly value: PageMetadata

  onClose?(): void
  onChange?(value: PageMetadata): void
}

export function PageMetadataPanel({value, onClose, onChange}: PageMetadataPanelProps) {
  const {
    title,
    description,
    slug,
    tags,
    image,
    socialMediaTitle,
    socialMediaDescription,
    socialMediaImage,
    properties
  } = value

  const [isChooseModalOpen, setChooseModalOpen] = useState(false)
  const [isEditModalOpen, setEditModalOpen] = useState(false)

  const [activeKey, setActiveKey] = useState(MetaDataType.General)

  const [metaDataProperties, setMetadataProperties] = useState<ListValue<PageMetadataProperty>[]>(
    properties
      ? properties.map(metaDataProperty => ({
          id: generateID(),
          value: metaDataProperty
        }))
      : []
  )

  const {t} = useTranslation()

  useEffect(() => {
    if (metaDataProperties) {
      onChange?.({...value, properties: metaDataProperties.map(({value}) => value)})
    }
  }, [metaDataProperties])

  function handleImageChange(currentImage: ImageRefFragment) {
    switch (activeKey) {
      case MetaDataType.General: {
        const image = currentImage
        onChange?.({...value, image})
        break
      }
      case MetaDataType.SocialMedia: {
        const socialMediaImage = currentImage
        onChange?.({...value, socialMediaImage})
        break
      }
      default: {
      }
    }
  }

  function currentContent() {
    switch (activeKey) {
      case MetaDataType.SocialMedia:
        return (
          <Panel>
            <Form fluid={true}>
              <Form.Group>
                <Message showIcon type="info">
                  {t('pageEditor.panels.metadataInfo')}
                </Message>
              </Form.Group>
              <Form.Group>
                <Form.ControlLabel>{t('pageEditor.panels.socialMediaTitle')}</Form.ControlLabel>
                <Form.Control
                  value={socialMediaTitle}
                  onChange={socialMediaTitle => {
                    onChange?.({...value, socialMediaTitle})
                  }}
                />
              </Form.Group>
              <Form.Group>
                <Form.ControlLabel>
                  {t('pageEditor.panels.socialMediaDescription')}
                </Form.ControlLabel>
                <Form.Control
                  rows={5}
                  as="textarea"
                  value={socialMediaDescription}
                  onChange={socialMediaDescription => {
                    onChange?.({...value, socialMediaDescription})
                  }}
                />
              </Form.Group>
              <Form.Group>
                <Form.ControlLabel>{t('pageEditor.panels.socialMediaImage')}</Form.ControlLabel>
                <ChooseEditImage
                  header={''}
                  image={socialMediaImage}
                  disabled={false}
                  openChooseModalOpen={() => {
                    setChooseModalOpen(true)
                  }}
                  openEditModalOpen={() => {
                    setEditModalOpen(true)
                  }}
                  removeImage={() => onChange?.({...value, socialMediaImage: undefined})}
                />
              </Form.Group>
            </Form>
          </Panel>
        )
      case MetaDataType.General:
        return (
          <Panel>
            <Form fluid={true}>
              <Form.Group>
                <Form.ControlLabel>{t('pageEditor.panels.slug')}</Form.ControlLabel>
                <Form.Control value={slug} onChange={slug => onChange?.({...value, slug})} />
              </Form.Group>
              <Form.Group>
                <Form.ControlLabel>{t('pageEditor.panels.title')}</Form.ControlLabel>
                <Form.Control value={title} onChange={title => onChange?.({...value, title})} />
                <Form.HelpText>{t('pageEditor.panels.titleHelpBlock')}</Form.HelpText>
              </Form.Group>
              <Form.Group>
                <Form.ControlLabel>{t('pageEditor.panels.description')}</Form.ControlLabel>
                <Form.Control
                  as="textarea"
                  value={description}
                  onChange={description => onChange?.({...value, description})}
                />
                <Form.HelpText>{t('pageEditor.panels.descriptionHelpBlock')}</Form.HelpText>
              </Form.Group>
              <Form.Group>
                <Form.ControlLabel>{t('pageEditor.panels.tags')}</Form.ControlLabel>
                <TagPicker
                  virtualized
                  style={{width: '100%'}}
                  creatable={true}
                  value={tags}
                  data={tags.map(tag => ({label: tag, value: tag}))}
                  onChange={tagsValue => onChange?.({...value, tags: tagsValue ?? []})}
                />
              </Form.Group>
              <Form.Group>
                <Form.ControlLabel>{t('pageEditor.panels.postImage')}</Form.ControlLabel>
                <ChooseEditImage
                  header={''}
                  image={image}
                  disabled={false}
                  openChooseModalOpen={() => {
                    setChooseModalOpen(true)
                  }}
                  openEditModalOpen={() => {
                    setEditModalOpen(true)
                  }}
                  removeImage={() => onChange?.({...value, image: undefined})}
                />
              </Form.Group>
            </Form>
          </Panel>
        )
      case MetaDataType.Properties:
        return (
          <Panel>
            <Form fluid={true}>
              <Form.Group>
                <Message showIcon type="info">
                  {t('pageEditor.panels.propertiesInfo')}
                </Message>
              </Form.Group>
              <Form.Group>
                <Form.ControlLabel>{t('pageEditor.panels.properties')}</Form.ControlLabel>
                <ListInput
                  value={metaDataProperties}
                  onChange={propertiesItemInput => setMetadataProperties(propertiesItemInput)}
                  defaultValue={{key: '', value: '', public: true}}>
                  {({value, onChange}) => (
                    <div style={{display: 'flex', flexDirection: 'row'}}>
                      <Input
                        placeholder={t('pageEditor.panels.key')}
                        style={{
                          width: '40%',
                          marginRight: '10px'
                        }}
                        value={value.key}
                        onChange={propertyKey => {
                          onChange({...value, key: propertyKey})
                        }}
                      />
                      <Input
                        placeholder={t('pageEditor.panels.value')}
                        style={{
                          width: '60%'
                        }}
                        value={value.value}
                        onChange={propertyValue => {
                          onChange({...value, value: propertyValue})
                        }}
                      />
                      <Form.Group style={{paddingTop: '6px', paddingLeft: '8px'}}>
                        <Toggle
                          style={{maxWidth: '70px', minWidth: '70px'}}
                          value={value.public}
                          checkedChildren={t('pageEditor.panels.public')}
                          unCheckedChildren={t('pageEditor.panels.private')}
                          checked={value.public}
                          onChange={isPublic => onChange({...value, public: isPublic})}
                        />
                      </Form.Group>
                    </div>
                  )}
                </ListInput>
              </Form.Group>
            </Form>
          </Panel>
        )
      default:
        return <></>
    }
  }

  return (
    <>
      <Drawer.Header>
        <Drawer.Title>{t('pageEditor.panels.metadata')}</Drawer.Title>
      </Drawer.Header>

      <Drawer.Body>
        <Nav
          appearance="tabs"
          activeKey={activeKey}
          onSelect={activeKey => setActiveKey(activeKey)}
          style={{marginBottom: 20}}>
          <Nav.Item eventKey={MetaDataType.General} icon={<CogIcon />}>
            {t('articleEditor.panels.general')}
          </Nav.Item>
          <Nav.Item eventKey={MetaDataType.SocialMedia} icon={<ShareAltIcon />}>
            {t('articleEditor.panels.socialMedia')}
          </Nav.Item>
          <Nav.Item eventKey={MetaDataType.Properties} icon={<ListIcon />}>
            {t('pageEditor.panels.properties')}
          </Nav.Item>
        </Nav>

        {currentContent()}
      </Drawer.Body>

      <Drawer.Footer>
        <Button appearance={'primary'} onClick={() => onClose?.()}>
          {t('pageEditor.panels.saveAndClose')}
        </Button>
      </Drawer.Footer>

      <Drawer show={isChooseModalOpen} size={'sm'} onHide={() => setChooseModalOpen(false)}>
        <ImageSelectPanel
          onClose={() => setChooseModalOpen(false)}
          onSelect={value => {
            setChooseModalOpen(false)
            handleImageChange(value)
          }}
        />
      </Drawer>
      {(value.image || value.socialMediaImage) && (
        <Drawer
          show={isEditModalOpen}
          size={'sm'}
          onHide={() => {
            setEditModalOpen(false)
          }}>
          <ImagedEditPanel
            id={activeKey === MetaDataType.General ? value.image?.id : value.socialMediaImage?.id}
            onClose={() => setEditModalOpen(false)}
          />
        </Drawer>
      )}
    </>
  )
}
