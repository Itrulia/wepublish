import React, {useEffect, useState} from 'react'

import {
  Button,
  ControlLabel,
  Drawer,
  Form,
  FormControl,
  FormGroup,
  HelpBlock,
  Icon,
  Input,
  Message,
  Nav,
  Panel,
  TagPicker,
  Toggle
} from 'rsuite'

import {ImagedEditPanel} from './imageEditPanel'
import {ImageSelectPanel} from './imageSelectPanel'
import {ImageRefFragment} from '../api'
import {MetaDataType} from '../blocks/types'

import {useTranslation} from 'react-i18next'
import {ChooseEditImage} from '../atoms/chooseEditImage'
import {ListInput, ListValue} from '../atoms/listInput'
import {generateID} from '../utility'

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
              <FormGroup>
                <Message showIcon type="info" description={t('pageEditor.panels.metadataInfo')} />
              </FormGroup>
              <FormGroup>
                <ControlLabel>{t('pageEditor.panels.socialMediaTitle')}</ControlLabel>
                <FormControl
                  value={socialMediaTitle}
                  onChange={socialMediaTitle => {
                    onChange?.({...value, socialMediaTitle})
                  }}
                />
              </FormGroup>
              <FormGroup>
                <ControlLabel>{t('pageEditor.panels.socialMediaDescription')}</ControlLabel>
                <FormControl
                  rows={5}
                  componentClass="textarea"
                  value={socialMediaDescription}
                  onChange={socialMediaDescription => {
                    onChange?.({...value, socialMediaDescription})
                  }}
                />
              </FormGroup>
              <FormGroup>
                <ControlLabel>{t('pageEditor.panels.socialMediaImage')}</ControlLabel>
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
              </FormGroup>
            </Form>
          </Panel>
        )
      case MetaDataType.General:
        return (
          <Panel>
            <Form fluid={true}>
              <FormGroup>
                <ControlLabel>{t('pageEditor.panels.slug')}</ControlLabel>
                <FormControl value={slug} onChange={slug => onChange?.({...value, slug})} />
              </FormGroup>
              <FormGroup>
                <ControlLabel>{t('pageEditor.panels.title')}</ControlLabel>
                <FormControl value={title} onChange={title => onChange?.({...value, title})} />
                <HelpBlock>{t('pageEditor.panels.titleHelpBlock')}</HelpBlock>
              </FormGroup>
              <FormGroup>
                <ControlLabel>{t('pageEditor.panels.description')}</ControlLabel>
                <FormControl
                  componentClass="textarea"
                  value={description}
                  onChange={description => onChange?.({...value, description})}
                />
                <HelpBlock>{t('pageEditor.panels.descriptionHelpBlock')}</HelpBlock>
              </FormGroup>
              <FormGroup>
                <ControlLabel>{t('pageEditor.panels.tags')}</ControlLabel>
                <TagPicker
                  style={{width: '100%'}}
                  creatable={true}
                  value={tags}
                  data={tags.map(tag => ({label: tag, value: tag}))}
                  onChange={tagsValue => onChange?.({...value, tags: tagsValue ?? []})}
                />
              </FormGroup>
              <FormGroup>
                <ControlLabel>{t('pageEditor.panels.postImage')}</ControlLabel>
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
              </FormGroup>
            </Form>
          </Panel>
        )
      case MetaDataType.Properties:
        return (
          <Panel>
            <Form fluid={true}>
              <FormGroup>
                <Message showIcon type="info" description={t('pageEditor.panels.propertiesInfo')} />
              </FormGroup>
              <FormGroup>
                <ControlLabel>{t('pageEditor.panels.properties')}</ControlLabel>
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
                      <FormGroup style={{paddingTop: '6px', paddingLeft: '8px'}}>
                        <Toggle
                          style={{maxWidth: '70px', minWidth: '70px'}}
                          value={value.public}
                          checkedChildren={t('pageEditor.panels.public')}
                          unCheckedChildren={t('pageEditor.panels.private')}
                          checked={value.public}
                          onChange={isPublic => onChange({...value, public: isPublic})}
                        />
                      </FormGroup>
                    </div>
                  )}
                </ListInput>
              </FormGroup>
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
          <Nav.Item eventKey={MetaDataType.General} icon={<Icon icon="cog" />}>
            {t('articleEditor.panels.general')}
          </Nav.Item>
          <Nav.Item eventKey={MetaDataType.SocialMedia} icon={<Icon icon="share-alt" />}>
            {t('articleEditor.panels.socialMedia')}
          </Nav.Item>
          <Nav.Item eventKey={MetaDataType.Properties} icon={<Icon icon="list" />}>
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
