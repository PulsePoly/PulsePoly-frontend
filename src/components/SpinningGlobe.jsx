import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import './SpinningGlobe.css';

const SpinningGlobe = () => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const globeGroupRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = null; // Transparent background
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 9;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create globe group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    // Create irregular wireframe mesh using icosahedron subdivision
    const icosahedronGeometry = new THREE.IcosahedronGeometry(3, 2);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: '#d3d3d3', // Light gray
      wireframe: true,
      transparent: true,
      opacity: 0.6
    });
    const wireframeMesh = new THREE.Mesh(icosahedronGeometry, wireframeMaterial);
    globeGroup.add(wireframeMesh);

    // Create nodes (dots) at vertices
    const vertices = icosahedronGeometry.attributes.position.array;
    const nodeGeometry = new THREE.SphereGeometry(0.03, 8, 8);
    const grayNodeMaterial = new THREE.MeshBasicMaterial({
      color: '#d3d3d3',
      transparent: true,
      opacity: 0.8
    });

    // Add gray nodes at all vertices
    for (let i = 0; i < vertices.length; i += 3) {
      const node = new THREE.Mesh(nodeGeometry, grayNodeMaterial);
      node.position.set(vertices[i], vertices[i + 1], vertices[i + 2]);
      globeGroup.add(node);
    }

    // Add red dots scattered across surface (20-25 dots)
    const redNodeMaterial = new THREE.MeshBasicMaterial({
      color: '#ff4444',
      transparent: true,
      opacity: 0.9
    });
    
    // Create glowing red dots
    const redGlowMaterial = new THREE.MeshBasicMaterial({
      color: '#ff4444',
      transparent: true,
      opacity: 0.3
    });
    const glowGeometry = new THREE.SphereGeometry(0.08, 8, 8);

    // Generate random points on sphere surface for red dots
    const numRedDots = 22;
    const redDotPositions = [];
    
    for (let i = 0; i < numRedDots; i++) {
      // Random point on sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 3;
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      redDotPositions.push({ x, y, z, hasGlow: Math.random() > 0.7 });
    }

    // Add red dots with optional glow
    redDotPositions.forEach((pos, index) => {
      const redNode = new THREE.Mesh(nodeGeometry, redNodeMaterial);
      redNode.position.set(pos.x, pos.y, pos.z);
      globeGroup.add(redNode);

      // Add glow to some red dots
      if (pos.hasGlow) {
        const glow = new THREE.Mesh(glowGeometry, redGlowMaterial);
        glow.position.set(pos.x, pos.y, pos.z);
        globeGroup.add(glow);
      }
    });

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      if (globeGroupRef.current) {
        globeGroupRef.current.rotation.y += 0.003;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current?.dispose();
      icosahedronGeometry.dispose();
      wireframeMaterial.dispose();
      nodeGeometry.dispose();
      grayNodeMaterial.dispose();
      redNodeMaterial.dispose();
      redGlowMaterial.dispose();
      glowGeometry.dispose();
    };
  }, []);

  return <div ref={containerRef} className="spinning-globe-container" />;
};

export default SpinningGlobe;

