'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface WaveBackgroundProps {
  onCelebration?: boolean;
}

export default function WaveBackground({ onCelebration = false }: WaveBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const waveRef = useRef({ 
    time: 0,
    isWaving: false,
    waveIntensity: 0,
    transitionProgress: 0,
    baseAmplitude: 3,
    waveAmplitude: 5
  })
  
  // Función de easing para suavizar la transición
  const easeOutCubic = (x: number): number => {
    return 1 - Math.pow(1 - x, 3);
  }
  
  useEffect(() => {
    if (onCelebration) {
      waveRef.current.isWaving = true;
      waveRef.current.time = 0;
      waveRef.current.waveIntensity = 1;
      waveRef.current.transitionProgress = 0;
    }
  }, [onCelebration]);

  useEffect(() => {
    if (!containerRef.current) return
    
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)
    containerRef.current.appendChild(renderer.domElement)
    
    const geometry = new THREE.BufferGeometry()
    const particles = 100
    const positions = new Float32Array(particles * particles * 3)
    const colors = new Float32Array(particles * particles * 3)
    
    for (let i = 0; i < particles; i++) {
      for (let j = 0; j < particles; j++) {
        const index = (i * particles + j) * 3
        
        positions[index] = i - particles / 2
        positions[index + 1] = 0
        positions[index + 2] = j - particles / 2
        
        colors[index] = 0
        colors[index + 1] = 0.8
        colors[index + 2] = 0.8
      }
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    
    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    })
    
    const points = new THREE.Points(geometry, material)
    scene.add(points)
    
    camera.position.z = 50
    camera.position.y = 20
    camera.lookAt(0, 0, 0)
    
    let time = 0
    const animate = () => {
      requestAnimationFrame(animate)
      
      time += 0.01
      
      if (waveRef.current.isWaving) {
        waveRef.current.time += 0.1;
        waveRef.current.transitionProgress += 0.008;
        
        if (waveRef.current.transitionProgress >= 1) {
          waveRef.current.isWaving = false;
        }
        
        // Usar la función de easing para una transición más suave
        const easedProgress = easeOutCubic(waveRef.current.transitionProgress);
        waveRef.current.waveIntensity = 1 - easedProgress;
      }
      
      const positions = geometry.attributes.position.array as Float32Array
      for (let i = 0; i < particles; i++) {
        for (let j = 0; j < particles; j++) {
          const index = (i * particles + j) * 3
          
          const baseHeight = Math.sin((i + time) * 0.2) * Math.cos((j + time) * 0.2) * 
                           waveRef.current.baseAmplitude;
          
          let finalHeight = baseHeight;
          
          if (waveRef.current.waveIntensity > 0) {
            const waveHeight = Math.sin((i + j) * 0.3 - waveRef.current.time) * 
                             waveRef.current.waveAmplitude;
            
            finalHeight = baseHeight * (1 - waveRef.current.waveIntensity) + 
                         (baseHeight + waveHeight) * waveRef.current.waveIntensity;
          }
          
          positions[index + 1] = finalHeight;
        }
      }
      
      geometry.attributes.position.needsUpdate = true
      renderer.render(scene, camera)
    }
    
    animate()
    
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      containerRef.current?.removeChild(renderer.domElement)
    }
  }, [])
  
  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 -z-10 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-900"
      style={{ opacity: 1 }}
    />
  )
} 