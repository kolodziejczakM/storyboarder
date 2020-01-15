import React, { useEffect, useState, useRef, useContext } from 'react'
import { connect } from 'react-redux'
import * as THREE from 'three'

import h from '../../../utils/h'
import {
    updateObject,
    setCameraShot,

    getSceneObjects,
    getSelections,
    getActiveCamera,
} from '../../../shared/reducers/shot-generator'
import useLongPress from '../../../hooks/use-long-press'
import Select from '../Select'

import throttle from 'lodash.throttle'

import CameraControls from '../../CameraControls'
import {setShot, ShotSizes, ShotAngles} from '../../cameraUtils'
import { SceneContext } from '../../Components'
import { useDrag } from 'react-use-gesture'

const CameraPanelInspector = connect(
    state => ({
      sceneObjects: getSceneObjects(state),
      activeCamera: getActiveCamera(state),
      selections: getSelections(state),
      cameraShots: state.cameraShots
    }),
    {
      updateObject,
      setCameraShot
    }
)(
  React.memo(({ camera, selections, sceneObjects, activeCamera, cameraShots, updateObject, setCameraShot }) => {
    if (!camera) return h(['div.camera-inspector'])
    const { scene } = useContext(SceneContext)
    
    const shotInfo = cameraShots[camera.userData.id] || {}
    const [currentShotSize, setCurrentShotSize] = useState(shotInfo.size)
    const [currentShotAngle, setCurrentShotAngle] = useState(shotInfo.angle)
  
    const selectionsRef = useRef(selections)
    const selectedCharacters = useRef([])
    
    useEffect(() => {
      selectionsRef.current = selections;
  
      selectedCharacters.current = selections.filter((id) => {
        return (sceneObjects[id] && sceneObjects[id].type === 'character')
      })
    }, [selections])
  
    useEffect(() => {
      setCurrentShotSize(shotInfo.size)
    }, [shotInfo.size, camera])
  
    useEffect(() => {
      setCurrentShotAngle(shotInfo.angle)
    }, [shotInfo.angle, camera])
    
    let cameraState = {...sceneObjects[activeCamera]}
    
    let fakeCamera = camera.clone() // TODO reuse a single object
    let focalLength = fakeCamera.getFocalLength()
    let cameraRoll = Math.round(THREE.Math.radToDeg(cameraState.roll))
    let cameraPan = Math.round(THREE.Math.radToDeg(cameraState.rotation))
    let cameraTilt = Math.round(THREE.Math.radToDeg(cameraState.tilt))
    
    const getValueShifter = (draft) => () => {
      for (let [k, v] of Object.entries(draft)) {
        cameraState[k] += v
      }
  
      updateObject(cameraState.id, cameraState)
    }
    
    const moveCamera = ([speedX, speedY]) => () => {
      cameraState = CameraControls.getMovedState(cameraState, {x: speedX, y: speedY})
      updateObject(cameraState.id, cameraState)
    }
  
    const getCameraPanEvents = useDrag(throttle(({ down, delta: [dx, dy] }) => {
      let rotation = THREE.Math.degToRad(cameraPan - dx)
      let tilt = THREE.Math.degToRad(cameraTilt - dy)
      
      updateObject(cameraState.id, {rotation, tilt})
    }, 100, {trailing:false}))
    
    const onSetShot = ({size, angle}) => {
      let selected = scene.children.find((obj) => selectedCharacters.current.indexOf(obj.userData.id) >= 0)
      let characters = scene.children.filter((obj) => obj.userData.type === 'character')
  
      if (characters.length) {
        setShot({
          camera,
          characters,
          selected,
          updateObject,
          shotSize: size,
          shotAngle: angle
        })
      }
      
      setCameraShot(camera.userData.id, {size, angle})
    }
  
    const shotSizes = [
      {value: ShotSizes.EXTREME_CLOSE_UP, label: 'Extreme Close Up'},
      {value: ShotSizes.VERY_CLOSE_UP, label: 'Very Close Up'},
      {value: ShotSizes.CLOSE_UP, label: 'Close Up'},
      {value: ShotSizes.MEDIUM_CLOSE_UP, label: 'Medium Close Up'},
      {value: ShotSizes.BUST, label: 'Bust'},
      {value: ShotSizes.MEDIUM, label: 'Medium Shot'},
      {value: ShotSizes.MEDIUM_LONG, label: 'Medium Long Shot'},
      {value: ShotSizes.LONG, label: 'Long Shot / Wide'},
      {value: ShotSizes.EXTREME_LONG, label: 'Extreme Long Shot'},
      {value: ShotSizes.ESTABLISHING, label: 'Establishing Shot'}
    ]
  
    const shotAngles = [
      {value: ShotAngles.BIRDS_EYE, label: 'Bird\'s Eye'},
      {value: ShotAngles.HIGH, label: 'High'},
      {value: ShotAngles.EYE, label: 'Eye'},
      {value: ShotAngles.LOW, label: 'Low'},
      {value: ShotAngles.WORMS_EYE, label: 'Worm\'s Eye'}
    ]
    
    return h(
        ['div.camera-inspector',
          
          [
            ['div.camera-item.roll',
              [
                ['div.camera-item-control', [
                    ['div.row', [
                      ['div.camera-item-button', {...useLongPress(getValueShifter({roll: -THREE.Math.DEG2RAD}))}, ['div.arrow.left']],
                      ['div.camera-item-button', {...useLongPress(getValueShifter({roll: THREE.Math.DEG2RAD}))}, ['div.arrow.right']]
                    ]]
                ]],
                ['div.camera-item-label', `Roll: ${cameraRoll}°`]
              ]
            ],
            ['div.camera-item.pan',
              [
                ['div.camera-item-control', [
                  ['div.row', [
                      ['div.pan-control', {...getCameraPanEvents()}, ['div.pan-control-target']]
                  ]]
                ]],
                ['div.camera-item-label', `Pan: ${cameraPan}° // Tilt: ${cameraTilt}°`]
              ]
            ],
            ['div.camera-item.move',
              [
                ['div.camera-item-control', [
                  ['div.row', {style: {justifyContent: 'center'}}, [
                    ['div.camera-item-button', {...useLongPress(moveCamera([0, -0.1]))}, ['div.arrow.up']]
                  ]],
                  ['div.row', [
                    ['div.camera-item-button', {...useLongPress(moveCamera([-0.1, 0]))}, ['div.arrow.left']],
                    ['div.camera-item-button', {...useLongPress(moveCamera([0, 0.1]))}, ['div.arrow.down']],
                    ['div.camera-item-button', {...useLongPress(moveCamera([0.1, 0]))}, ['div.arrow.right']]
                  ]]
                ]],
                ['div.camera-item-label', 'Move']
              ]
            ],
            ['div.camera-item.elevate',
              [
                ['div.camera-item-control', [
                  ['div.row', [
                    ['div.camera-item-button', {...useLongPress(getValueShifter({z: 0.1}))}, ['div.arrow.up']]
                  ]],
                  ['div.row', [
                    ['div.camera-item-button', {...useLongPress(getValueShifter({z: -0.1}))}, ['div.arrow.down']]
                  ]]
                ]],
                ['div.camera-item-label', `Elevate: ${cameraState.z.toFixed(2)}m`]
              ]
            ],
            ['div.camera-item.lens',
              [
                ['div.camera-item-control', [
                  ['div.row', [
                    ['div.camera-item-button', {...useLongPress(getValueShifter({fov: 0.2}))}, ['div.arrow.left']],
                    ['div.camera-item-button', {...useLongPress(getValueShifter({fov: -0.2}))}, ['div.arrow.right']]
                  ]]
                ]],
                ['div.camera-item-label', `Lens: ${focalLength.toFixed(2)}mm`]
              ]
            ],
            ['div.camera-item.shots',
              [
                ['div.select',
                  [Select, {
                    label: 'Shot Size',
                    value: shotSizes.find(option => option.value === currentShotSize),
                    options: shotSizes,
                    onSetValue: (item) => onSetShot({size: item.value, angle: shotInfo.angle})
                }]],
                ['div.select',
                  [Select, {
                    label: 'Camera Angle',
                    value: shotAngles.find(option => option.value === currentShotAngle),
                    options: shotAngles,
                    onSetValue: (item) => onSetShot({size: shotInfo.size, angle: item.value})
                }]]
              ]
            ]
          ]
        ]
    )
  }
))

export default CameraPanelInspector
