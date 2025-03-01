import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Checkbox,
  Dropdown,
  Input,
  Label,
  Option,
  PresenceBadge,
  Select,
  Switch,
  Text
} from '@fluentui/react-components';
import { AddCircle20Regular, DataUsageSettings20Regular, Delete20Regular, Save20Regular } from '@fluentui/react-icons';
import React, { FC, useCallback, useEffect, useRef } from 'react';
import { Section } from '../components/Section';
import { Labeled } from '../components/Labeled';
import { ToolTipButton } from '../components/ToolTipButton';
import commonStore from '../stores/commonStore';
import { observer } from 'mobx-react-lite';
import { toast } from 'react-toastify';
import { ValuedSlider } from '../components/ValuedSlider';
import { NumberInput } from '../components/NumberInput';
import { Page } from '../components/Page';
import { useNavigate } from 'react-router';
import { RunButton } from '../components/RunButton';
import { updateConfig } from '../apis';
import { getStrategy } from '../utils';
import { useTranslation } from 'react-i18next';
import strategyImg from '../assets/images/strategy.jpg';
import strategyZhImg from '../assets/images/strategy_zh.jpg';
import { ResetConfigsButton } from '../components/ResetConfigsButton';
import { useMediaQuery } from 'usehooks-ts';
import { ApiParameters, Device, ModelParameters, Precision } from '../types/configs';
import { convertModel, convertToGGML, convertToSt } from '../utils/convert-model';

const ConfigSelector: FC<{
  selectedIndex: number,
  updateSelectedIndex: (i: number) => void
}> = observer(({ selectedIndex, updateSelectedIndex }) => {
  return (
    <Dropdown style={{ minWidth: 0 }} className="grow" value={commonStore.modelConfigs[selectedIndex].name}
      selectedOptions={[selectedIndex.toString()]}
      onOptionSelect={(_, data) => {
        if (data.optionValue) {
          updateSelectedIndex(Number(data.optionValue));
        }
      }}>
      {commonStore.modelConfigs.map((config, index) => <Option key={index} value={index.toString()}
          text={config.name}>
          <div className="flex justify-between grow">
            {config.name}
            {commonStore.modelSourceList.find(item => item.name === config.modelParameters.modelName)?.isComplete
              && <PresenceBadge status="available" />}
          </div>
        </Option>
      )}
    </Dropdown>
  );
});

const Configs: FC = observer(() => {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = React.useState(commonStore.currentModelConfigIndex);
  const [selectedConfig, setSelectedConfig] = React.useState(commonStore.modelConfigs[selectedIndex]);
  const [displayStrategyImg, setDisplayStrategyImg] = React.useState(false);
  const advancedHeaderRef = useRef<HTMLDivElement>(null);
  const mq = useMediaQuery('(min-width: 640px)');
  const navigate = useNavigate();
  const port = selectedConfig.apiParameters.apiPort;

  useEffect(() => {
    if (advancedHeaderRef.current)
      (advancedHeaderRef.current.firstElementChild as HTMLElement).style.padding = '0';
  }, []);

  const updateSelectedIndex = useCallback((newIndex: number) => {
    setSelectedIndex(newIndex);
    setSelectedConfig(commonStore.modelConfigs[newIndex]);

    // if you don't want to update the config used by the current startup in real time, comment out this line
    commonStore.setCurrentConfigIndex(newIndex);
  }, []);

  const setSelectedConfigName = (newName: string) => {
    setSelectedConfig({ ...selectedConfig, name: newName });
  };

  const setSelectedConfigApiParams = (newParams: Partial<ApiParameters>) => {
    setSelectedConfig({
      ...selectedConfig, apiParameters: {
        ...selectedConfig.apiParameters,
        ...newParams
      }
    });
  };

  const setSelectedConfigModelParams = (newParams: Partial<ModelParameters>) => {
    setSelectedConfig({
      ...selectedConfig, modelParameters: {
        ...selectedConfig.modelParameters,
        ...newParams
      }
    });
  };

  const onClickSave = () => {
    commonStore.setModelConfig(selectedIndex, selectedConfig);
    updateConfig({
      max_tokens: selectedConfig.apiParameters.maxResponseToken,
      temperature: selectedConfig.apiParameters.temperature,
      top_p: selectedConfig.apiParameters.topP,
      presence_penalty: selectedConfig.apiParameters.presencePenalty,
      frequency_penalty: selectedConfig.apiParameters.frequencyPenalty
    });
    toast(t('Config Saved'), { autoClose: 300, type: 'success' });
  };

  return (
    <Page title={t('Configs')} content={
      <div className="flex flex-col gap-2 overflow-hidden">
        <div className="flex gap-2 items-center">
          <ConfigSelector selectedIndex={selectedIndex} updateSelectedIndex={updateSelectedIndex} />
          <ToolTipButton desc={t('New Config')} icon={<AddCircle20Regular />} onClick={() => {
            commonStore.createModelConfig();
            updateSelectedIndex(commonStore.modelConfigs.length - 1);
          }} />
          <ToolTipButton desc={t('Delete Config')} icon={<Delete20Regular />} onClick={() => {
            commonStore.deleteModelConfig(selectedIndex);
            updateSelectedIndex(Math.min(selectedIndex, commonStore.modelConfigs.length - 1));
          }} />
          <ResetConfigsButton afterConfirm={() => {
            setSelectedIndex(0);
            setSelectedConfig(commonStore.modelConfigs[0]);
          }} />
          <ToolTipButton desc={mq ? '' : t('Save Config')} icon={<Save20Regular />} text={mq ? t('Save Config') : null}
            onClick={onClickSave} />
        </div>
        <div className="flex items-center gap-4">
          <Label>{t('Config Name')}</Label>
          <Input className="grow" value={selectedConfig.name} onChange={(e, data) => {
            setSelectedConfigName(data.value);
          }} />
        </div>
        <div className="flex flex-col gap-2 overflow-y-hidden">
          <Section
            title={t('Default API Parameters')}
            desc={t('Hover your mouse over the text to view a detailed description. Settings marked with * will take effect immediately after being saved.')}
            content={
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Labeled label={t('API Port')}
                  desc={t('Open the following URL with your browser to view the API documentation') + `: http://127.0.0.1:${port}/docs. ` +
                    t('This tool\'s API is compatible with OpenAI API. It can be used with any ChatGPT tool you like. Go to the settings of some ChatGPT tool, replace the \'https://api.openai.com\' part in the API address with \'') + `http://127.0.0.1:${port}` + '\'.'}
                  content={
                    <NumberInput value={port} min={1} max={65535} step={1}
                      onChange={(e, data) => {
                        setSelectedConfigApiParams({
                          apiPort: data.value
                        });
                      }} />
                  } />
                <Labeled label={t('Max Response Token') + ' *'}
                  desc={t('By default, the maximum number of tokens that can be answered in a single response, it can be changed by the user by specifying API parameters.')}
                  content={
                    <ValuedSlider value={selectedConfig.apiParameters.maxResponseToken} min={100} max={8100}
                      step={100}
                      input
                      onChange={(e, data) => {
                        setSelectedConfigApiParams({
                          maxResponseToken: data.value
                        });
                      }} />
                  } />
                <Labeled label={t('Temperature') + ' *'}
                  desc={t('Sampling temperature, it\'s like giving alcohol to a model, the higher the stronger the randomness and creativity, while the lower, the more focused and deterministic it will be.')}
                  content={
                    <ValuedSlider value={selectedConfig.apiParameters.temperature} min={0} max={2} step={0.1}
                      input
                      onChange={(e, data) => {
                        setSelectedConfigApiParams({
                          temperature: data.value
                        });
                      }} />
                  } />
                <Labeled label={t('Top_P') + ' *'}
                  desc={t('Just like feeding sedatives to the model. Consider the results of the top n% probability mass, 0.1 considers the top 10%, with higher quality but more conservative, 1 considers all results, with lower quality but more diverse.')}
                  content={
                    <ValuedSlider value={selectedConfig.apiParameters.topP} min={0} max={1} step={0.1} input
                      onChange={(e, data) => {
                        setSelectedConfigApiParams({
                          topP: data.value
                        });
                      }} />
                  } />
                <Labeled label={t('Presence Penalty') + ' *'}
                  desc={t('Positive values penalize new tokens based on whether they appear in the text so far, increasing the model\'s likelihood to talk about new topics.')}
                  content={
                    <ValuedSlider value={selectedConfig.apiParameters.presencePenalty} min={-2} max={2}
                      step={0.1} input
                      onChange={(e, data) => {
                        setSelectedConfigApiParams({
                          presencePenalty: data.value
                        });
                      }} />
                  } />
                <Labeled label={t('Frequency Penalty') + ' *'}
                  desc={t('Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model\'s likelihood to repeat the same line verbatim.')}
                  content={
                    <ValuedSlider value={selectedConfig.apiParameters.frequencyPenalty} min={-2} max={2}
                      step={0.1} input
                      onChange={(e, data) => {
                        setSelectedConfigApiParams({
                          frequencyPenalty: data.value
                        });
                      }} />
                  } />
              </div>
            }
          />
          <Section
            title={t('Model Parameters')}
            content={
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Labeled label={t('Model')} content={
                  <div className="flex gap-2 grow">
                    <Select style={{ minWidth: 0 }} className="grow"
                      value={selectedConfig.modelParameters.modelName}
                      onChange={(e, data) => {
                        const modelSource = commonStore.modelSourceList.find(item => item.name === data.value);
                        if (modelSource?.customTokenizer)
                          setSelectedConfigModelParams({
                            modelName: data.value,
                            useCustomTokenizer: true,
                            customTokenizer: modelSource?.customTokenizer
                          });
                        else // prevent customTokenizer from being overwritten
                          setSelectedConfigModelParams({
                            modelName: data.value,
                            useCustomTokenizer: false
                          });
                      }}>
                      {!commonStore.modelSourceList.find(item => item.name === selectedConfig.modelParameters.modelName)?.isComplete
                        && <option key={-1}
                          value={selectedConfig.modelParameters.modelName}>{selectedConfig.modelParameters.modelName}
                        </option>}
                      {commonStore.modelSourceList.map((modelItem, index) =>
                        modelItem.isComplete && <option key={index} value={modelItem.name}>{modelItem.name}</option>
                      )}
                    </Select>
                    <ToolTipButton desc={t('Manage Models')} icon={<DataUsageSettings20Regular />} onClick={() => {
                      navigate({ pathname: '/models' });
                    }} />
                  </div>
                } />
                {
                  !selectedConfig.modelParameters.device.startsWith('WebGPU') ?
                    (selectedConfig.modelParameters.device !== 'CPU (rwkv.cpp)' ?
                      <ToolTipButton text={t('Convert')}
                        desc={t('Convert model with these configs. Using a converted model will greatly improve the loading speed, but model parameters of the converted model cannot be modified.')}
                        onClick={() => convertModel(selectedConfig, navigate)} /> :
                      <ToolTipButton text={t('Convert To GGML Format')}
                        desc=""
                        onClick={() => convertToGGML(selectedConfig, navigate)} />)
                    : <ToolTipButton text={t('Convert To Safe Tensors Format')}
                      desc=""
                      onClick={() => convertToSt(selectedConfig, navigate)} />
                }
                <Labeled label={t('Strategy')} content={
                  <Dropdown style={{ minWidth: 0 }} className="grow" value={t(selectedConfig.modelParameters.device)!}
                    selectedOptions={[selectedConfig.modelParameters.device]}
                    onOptionSelect={(_, data) => {
                      if (data.optionValue) {
                        setSelectedConfigModelParams({
                          device: data.optionValue as Device
                        });
                      }
                    }}>
                    <Option value="CPU">CPU</Option>
                    <Option value="CPU (rwkv.cpp)">{t('CPU (rwkv.cpp, Faster)')!}</Option>
                    {commonStore.platform === 'darwin' && <Option value="MPS">MPS</Option>}
                    <Option value="CUDA">CUDA</Option>
                    <Option value="CUDA-Beta">{t('CUDA (Beta, Faster)')!}</Option>
                    <Option value="WebGPU">WebGPU</Option>
                    <Option value="WebGPU (Python)">WebGPU (Python)</Option>
                    <Option value="Custom">{t('Custom')!}</Option>
                  </Dropdown>
                } />
                {
                  selectedConfig.modelParameters.device !== 'Custom' && <Labeled label={t('Precision')}
                    desc={t('int8 uses less VRAM, but has slightly lower quality. fp16 has higher quality.')}
                    content={
                      <Dropdown
                        style={{ minWidth: 0 }} className="grow"
                        value={selectedConfig.modelParameters.precision}
                        selectedOptions={[selectedConfig.modelParameters.precision]}
                        onOptionSelect={(_, data) => {
                          if (data.optionText) {
                            setSelectedConfigModelParams({
                              precision: data.optionText as Precision
                            });
                          }
                        }}>
                        {selectedConfig.modelParameters.device !== 'CPU' && selectedConfig.modelParameters.device !== 'MPS' &&
                          <Option>fp16</Option>}
                        {selectedConfig.modelParameters.device !== 'CPU (rwkv.cpp)' && <Option>int8</Option>}
                        {selectedConfig.modelParameters.device.startsWith('WebGPU') && <Option>nf4</Option>}
                        {selectedConfig.modelParameters.device !== 'CPU (rwkv.cpp)' && !selectedConfig.modelParameters.device.startsWith('WebGPU') &&
                          <Option>fp32</Option>}
                        {selectedConfig.modelParameters.device === 'CPU (rwkv.cpp)' && <Option>Q5_1</Option>}
                      </Dropdown>
                    } />
                }
                {
                  selectedConfig.modelParameters.device.startsWith('CUDA') &&
                  <Labeled label={t('Current Strategy')}
                    content={<Text> {getStrategy(selectedConfig)} </Text>} />
                }
                {
                  selectedConfig.modelParameters.device.startsWith('CUDA') &&
                  <Labeled label={t('Stored Layers')}
                    desc={t('Number of the neural network layers loaded into VRAM, the more you load, the faster the speed, but it consumes more VRAM. (If your VRAM is not enough, it will fail to load)')}
                    content={
                      <ValuedSlider value={selectedConfig.modelParameters.storedLayers} min={0}
                        max={selectedConfig.modelParameters.maxStoredLayers} step={1} input
                        onChange={(e, data) => {
                          setSelectedConfigModelParams({
                            storedLayers: data.value
                          });
                        }} />
                    } />
                }
                {selectedConfig.modelParameters.device.startsWith('CUDA') && <div />}
                {
                  displayStrategyImg &&
                  <img style={{ width: '80vh', height: 'auto', zIndex: 100 }}
                    className="fixed left-0 top-0 rounded-xl select-none"
                    src={commonStore.settings.language === 'zh' ? strategyZhImg : strategyImg} />
                }
                {
                  selectedConfig.modelParameters.device === 'Custom' &&
                  <Labeled label="Strategy"
                    onMouseEnter={() => setDisplayStrategyImg(true)}
                    onMouseLeave={() => setDisplayStrategyImg(false)}
                    content={
                      <Input className="grow"
                        placeholder={commonStore.platform !== 'darwin' ? 'cuda:0 fp16 *20 -> cuda:1 fp16' : 'mps fp32'}
                        value={selectedConfig.modelParameters.customStrategy}
                        onChange={(e, data) => {
                          setSelectedConfigModelParams({
                            customStrategy: data.value
                          });
                        }} />
                    } />
                }
                {selectedConfig.modelParameters.device === 'Custom' && <div />}
                {
                  (selectedConfig.modelParameters.device.startsWith('CUDA') || selectedConfig.modelParameters.device === 'Custom') &&
                  <Labeled label={t('Use Custom CUDA kernel to Accelerate')}
                    desc={t('Enabling this option can greatly improve inference speed and save some VRAM, but there may be compatibility issues (output garbled). If it fails to start, please turn off this option, or try to upgrade your gpu driver.')}
                    content={
                      <Switch checked={selectedConfig.modelParameters.useCustomCuda}
                        onChange={(e, data) => {
                          setSelectedConfigModelParams({
                            useCustomCuda: data.checked
                          });
                        }} />
                    } />
                }
                {selectedConfig.modelParameters.device !== 'WebGPU' &&
                  <Accordion className="sm:col-span-2" collapsible
                    openItems={!commonStore.modelParamsCollapsed && 'advanced'}
                    onToggle={(e, data) => {
                      if (data.value === 'advanced')
                        commonStore.setModelParamsCollapsed(!commonStore.modelParamsCollapsed);
                    }}>
                    <AccordionItem value="advanced">
                      <AccordionHeader ref={advancedHeaderRef} size="small">{t('Advanced')}</AccordionHeader>
                      <AccordionPanel>
                        <div className="flex flex-col">
                          <div className="flex grow">
                            <Checkbox className="select-none"
                              size="large" label={t('Use Custom Tokenizer')}
                              checked={selectedConfig.modelParameters.useCustomTokenizer}
                              onChange={(_, data) => {
                                setSelectedConfigModelParams({
                                  useCustomTokenizer: data.checked as boolean
                                });
                              }} />
                            <Input className="grow"
                              placeholder={t('Tokenizer Path (e.g. backend-python/rwkv_pip/20B_tokenizer.json or rwkv_vocab_v20230424.txt)')!}
                              value={selectedConfig.modelParameters.customTokenizer}
                              onChange={(e, data) => {
                                setSelectedConfigModelParams({
                                  customTokenizer: data.value
                                });
                              }} />
                          </div>
                        </div>
                      </AccordionPanel>
                    </AccordionItem>
                  </Accordion>
                }
              </div>
            }
          />
          {mq && <div style={{ minHeight: '30px' }} />}
        </div>
        <div className="flex flex-row-reverse sm:fixed bottom-2 right-2">
          <div className="flex gap-2">
            {selectedConfig.modelParameters.device !== 'WebGPU'
              && <Checkbox className="select-none"
                size="large" label={t('Enable WebUI')}
                checked={selectedConfig.enableWebUI}
                onChange={(_, data) => {
                  setSelectedConfig({
                    ...selectedConfig,
                    enableWebUI: data.checked as boolean
                  });
                }} />}
            <RunButton onClickRun={onClickSave} />
          </div>
        </div>
      </div>
    } />
  );
});

export default Configs;
