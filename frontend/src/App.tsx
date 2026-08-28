import "./index.css"
import logo from "./assets/logo.png"
import ubc_logo from "./assets/ubc-logo.png"
import uoft_logo from "./assets/uoft-logo.png"
import mcgill_logo from "./assets/mcgill-logo.png"
import waterloo_logo from "./assets/uwaterloo-logo.png"
import uofa_logo from "./assets/uofa-logo.png"
import uwestern_logo from "./assets/uwestern-logo.png"
import mcmaster_logo from "./assets/mcmaster-logo.png"
import { useEffect, useRef } from "react"
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

function Search() {
  const mountref = useRef<HTMLDivElement>(null)    
  const token = localStorage.getItem("tokenstring")
  const username = token ? JSON.parse(atob(token.split('.')[1])).sub : null
  useEffect(() => {

        // --- 1. ENGINE SETUP ---
        const scene = new THREE.Scene();
        const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -35, 0) });
        
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 20;
        const camera = new THREE.OrthographicCamera(frustumSize * aspect / -2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / -2, 0.1, 1000);
        camera.position.set(0, 0, 20);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        mountref.current!.appendChild(renderer.domElement)
        renderer.domElement.style.position = "fixed";
        renderer.domElement.style.inset = "0";
        renderer.domElement.style.width = "100vw";
        renderer.domElement.style.height = "100vh";
        renderer.domElement.style.display = "block";
        renderer.domElement.style.zIndex = "0";
        // --- 2. TEXTURES ---
        const loader = new THREE.TextureLoader();
        const textures = [
            loader.load(ubc_logo),
            loader.load(uoft_logo),
            loader.load(mcgill_logo),
            loader.load(waterloo_logo),
            loader.load(uofa_logo),
            loader.load(uwestern_logo),
            loader.load(mcmaster_logo),
        ];
        // --- 3. PHYSICS BOUNDARIES ---
        const addWall = (x: number, y: number, nx: number, ny: number) => {
            const shape = new CANNON.Plane();
            const body = new CANNON.Body({ mass: 0, shape });
            body.position.set(x, y, 0);
            body.quaternion.setFromEuler(nx, ny, 0);
            world.addBody(body);
        };
        addWall(0, -10, -Math.PI/2, 0); // Floor
        addWall(-10 * aspect, 0, 0, Math.PI/2); // Left
        addWall(10 * aspect, 0, 0, -Math.PI/2); // Right

        // --- 4. THE BALLS ---
        const spheres: { mesh: THREE.Mesh; body: CANNON.Body }[] = [];
        const sphereGeo = new THREE.SphereGeometry(1.6, 64, 64);
        // const palette = [0x0038ff, 0x6e96ff, 0xffffff]; // Blue, Light Blue, White
        const palette = [0xffffff];
        function spawnBall() {
            const color = palette[Math.floor(Math.random() * palette.length)];
            const material = new THREE.MeshPhongMaterial({
                color: color,
                shininess: 100,
                specular: 0x444444,
                map: textures[Math.floor(Math.random() * textures.length)] // Randomly assign texture
            });

            const mesh = new THREE.Mesh(sphereGeo, material);
            scene.add(mesh);

            const body = new CANNON.Body({
                mass: 1.2,
                shape: new CANNON.Sphere(1.6),
                position: new CANNON.Vec3((Math.random()-0.5)*10, 15, 0),
                linearDamping: 0.2
            });
            
            body.linearFactor = new CANNON.Vec3(1, 1, 0);
            // body.angularFactor = new CANNON.Vec3(0, 0, 1); // Lock to 2D spinning (spin only on one axis)
            body.angularFactor = new CANNON.Vec3(1, 1, 1); // Allow full 3D rotations
            
            world.addBody(body);
            spheres.push({ mesh, body });
        }

        for(let i = 0; i < 20; i++) setTimeout(spawnBall, i * 120);

        // --- 5. LIGHTING (Mimicking the image highlights) ---
        scene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const topLight = new THREE.DirectionalLight(0xffffff, 1.5);
        topLight.position.set(0, 10, 10);
        scene.add(topLight);


        // --- INTERACTION: CLICK TO PROPEL ---
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();


        let animationId: number
        // --- 6. ANIMATION ---
        function animate() {
            animationId = requestAnimationFrame(animate);
            world.fixedStep();
            spheres.forEach(s => {
                s.mesh.position.copy(s.body.position);
                s.mesh.quaternion.copy(s.body.quaternion);
            });
            renderer.render(scene, camera);
        }
        animate();
      const handleMouseDown = (event: MouseEvent) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(spheres.map(s => s.mesh));

        if (intersects.length > 0) {
          const clickedMesh = intersects[0].object;
          const sphereObj = spheres.find(s => s.mesh === clickedMesh);

          if (sphereObj) {
            const forceX = (Math.random() - 0.5) * 10;
            const forceY = 45;
            const impulse = new CANNON.Vec3(forceX, forceY, 0);
            sphereObj.body.applyImpulse(impulse, new CANNON.Vec3(0, 0, 0));
            const spinPower = (Math.random() - 0.5) * 20;
            sphereObj.body.angularVelocity.x += 2;
            sphereObj.body.angularVelocity.y += 7;
            sphereObj.body.angularVelocity.z += spinPower;
          }
        }
      };

      const handleResize = () => {
        const aspect = window.innerWidth / window.innerHeight;
        camera.left = frustumSize * aspect / -2;
        camera.right = frustumSize * aspect / 2;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };

      window.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('resize', handleResize);

      return () => {
        cancelAnimationFrame(animationId);
        window.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('resize', handleResize);
        renderer.dispose();
        if (mountref.current) {
          mountref.current.removeChild(renderer.domElement);
        }
      };
  }, [])


  return(
    <>

    <div ref={mountref}/>
  <header>
    <div className="headerRow">
      <a className="logoLink" href="/Search">
        <img
          className="siteLogo"
          src={logo}
          alt="UKNOW logo"
        />
      </a>
      <div className="topActions">
        {username ? <a className="pillLink" onClick={(e) =>{
          e.preventDefault()
          localStorage.removeItem("tokenstring")
          window.location.href="/Search"
        }}>Log out as {username}</a> : <a className="pillLink" href="/Auth">Log in</a>}
      </div>
    </div>
  </header>
  <a className="pillLink submitCorner" href="/submit/">
    Submit a record
  </a>
  <div className="page">
    <main>
      <div className="heading">
        <h1>UKNOW</h1>
        <br></br>
        <br></br>
        <br></br>
        <h3>Can you get into your dream university?</h3>
      </div>
      <div className="heading">
      </div>
      <form
        method="get"
        action="/results"
        style={{ width: "100%", maxWidth: 640 }}
      >
        <div className="searchRow">
          <input
            name="Program"
            type="text"
            className="textbox"
            placeholder="Type the program name in here"
          />
          <button className="searchB">Search</button>
        </div>
        <div className="filterzz">
          <label>
            <span>GPA:</span>
            <input
              name="GPA"
              type="number"
              className="number-input"
              style={{ fontFamily: "Tahoma" }}
              min={0}
              max={100}
              step="0.5"
              placeholder={"e.g. 90"}
              size={200}
            />
          </label>
          <label>
            <span>University:</span>
            <input name="University" type="text" className="textbox" placeholder="Type the university name in here" size={200}/>
          </label>
        </div>
      </form>
      {/*
      <section class="features">
          {% for feature in features %}
          <div class="feature-card">
          <h2>Feature</h2>
          <p>{{ feature }}</p>
          </div>
          {% endfor %}
      </section>
      */}
    </main>
  </div>
</>
  )
}

export default Search
