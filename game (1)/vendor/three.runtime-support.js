/* SoonLab Three.js runtime support for direct-open classic-script games. */
(function installSoonLabThreeRuntime(global) {
  "use strict";

  function clampPixelRatio(value, maximum) {
    const ratio = Number.isFinite(value) && value > 0 ? value : 1;
    const limit = Number.isFinite(maximum) && maximum >= 1 ? maximum : 2;
    return Math.min(ratio, limit);
  }

  function createFixedStepLoop(options) {
    const settings = options || {};
    const step = typeof settings.step === "function" ? settings.step : function noop() {};
    const render = typeof settings.render === "function" ? settings.render : function noop() {};
    const onError = typeof settings.onError === "function" ? settings.onError : function rethrow(error) { throw error; };
    const requestFrame = settings.requestFrame || global.requestAnimationFrame.bind(global);
    const cancelFrame = settings.cancelFrame || global.cancelAnimationFrame.bind(global);
    const stepHz = Number.isFinite(settings.stepHz) && settings.stepHz > 0 ? settings.stepHz : 60;
    const fixedSeconds = 1 / stepHz;
    const maxFrameDeltaMs = Number.isFinite(settings.maxFrameDeltaMs) && settings.maxFrameDeltaMs > 0
      ? settings.maxFrameDeltaMs
      : 250;
    const maxSubSteps = Number.isInteger(settings.maxSubSteps) && settings.maxSubSteps > 0
      ? settings.maxSubSteps
      : 5;

    let frameId = 0;
    let previousMs = 0;
    let accumulatorSeconds = 0;
    let running = false;
    let paused = false;

    function frame(nowMs) {
      if (!running) return;
      try {
        const elapsedMs = previousMs === 0 ? 0 : Math.min(Math.max(nowMs - previousMs, 0), maxFrameDeltaMs);
        previousMs = nowMs;
        if (!paused) {
          accumulatorSeconds += elapsedMs / 1000;
          let subSteps = 0;
          while (accumulatorSeconds >= fixedSeconds && subSteps < maxSubSteps) {
            step(fixedSeconds);
            accumulatorSeconds -= fixedSeconds;
            subSteps += 1;
          }
          if (subSteps === maxSubSteps && accumulatorSeconds >= fixedSeconds) {
            accumulatorSeconds %= fixedSeconds;
          }
        }
        render(paused ? 0 : accumulatorSeconds / fixedSeconds, elapsedMs / 1000);
      } catch (error) {
        running = false;
        frameId = 0;
        onError(error);
        return;
      }
      frameId = requestFrame(frame);
    }

    return Object.freeze({
      start: function start() {
        if (running) return;
        running = true;
        previousMs = 0;
        accumulatorSeconds = 0;
        frameId = requestFrame(frame);
      },
      stop: function stop() {
        running = false;
        previousMs = 0;
        accumulatorSeconds = 0;
        if (frameId) cancelFrame(frameId);
        frameId = 0;
      },
      setPaused: function setPaused(value) {
        paused = Boolean(value);
        previousMs = 0;
        accumulatorSeconds = 0;
      },
      isRunning: function isRunning() {
        return running;
      }
    });
  }

  function observeRendererSize(options) {
    const settings = options || {};
    const container = settings.container;
    const renderer = settings.renderer;
    const camera = settings.camera;
    if (!container || !renderer || !camera) throw new Error("observeRendererSize requires container, renderer, and camera");

    let scheduled = false;
    let disposed = false;
    function resizeNow() {
      if (disposed) return;
      scheduled = false;
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      renderer.setPixelRatio(clampPixelRatio(global.devicePixelRatio, settings.maxPixelRatio));
      renderer.setSize(width, height, false);
      if (camera.isPerspectiveCamera) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      } else if (camera.isOrthographicCamera) {
        if (typeof settings.updateOrthographic !== "function") {
          throw new Error("observeRendererSize requires updateOrthographic for an orthographic camera");
        }
        settings.updateOrthographic(camera, width, height);
        camera.updateProjectionMatrix();
      }
      if (typeof settings.onResize === "function") settings.onResize(width, height, rect);
    }

    function scheduleResize() {
      if (scheduled || disposed) return;
      scheduled = true;
      global.requestAnimationFrame(resizeNow);
    }

    const resizeObserver = typeof global.ResizeObserver === "function"
      ? new global.ResizeObserver(scheduleResize)
      : null;
    if (resizeObserver) resizeObserver.observe(container);
    global.addEventListener("resize", scheduleResize);
    global.addEventListener("orientationchange", scheduleResize);
    global.document.addEventListener("fullscreenchange", scheduleResize);
    resizeNow();

    return Object.freeze({
      resizeNow,
      dispose: function dispose() {
        disposed = true;
        if (resizeObserver) resizeObserver.disconnect();
        global.removeEventListener("resize", scheduleResize);
        global.removeEventListener("orientationchange", scheduleResize);
        global.document.removeEventListener("fullscreenchange", scheduleResize);
      }
    });
  }

  function createInputLifecycle(options) {
    const settings = options || {};
    const target = settings.target || global;
    const pressed = new Set();
    const listeners = [];
    let attached = false;

    function add(type, handler, listenerOptions) {
      target.addEventListener(type, handler, listenerOptions);
      listeners.push([type, handler, listenerOptions]);
    }
    function reset() {
      pressed.clear();
      if (typeof settings.onReset === "function") settings.onReset();
    }
    function keyDown(event) {
      pressed.add(event.code);
      if (typeof settings.onKeyDown === "function") settings.onKeyDown(event, pressed);
    }
    function keyUp(event) {
      pressed.delete(event.code);
      if (typeof settings.onKeyUp === "function") settings.onKeyUp(event, pressed);
    }
    function pointerMove(event) {
      if (typeof settings.onPointerMove === "function") settings.onPointerMove(event);
    }
    function pointerDown(event) {
      if (typeof settings.onPointerDown === "function") settings.onPointerDown(event);
    }
    function pointerUp(event) {
      if (typeof settings.onPointerUp === "function") settings.onPointerUp(event);
    }
    function visibilityChange() {
      if (global.document.hidden) reset();
    }

    function attach() {
      if (attached) return;
      attached = true;
      add("keydown", keyDown);
      add("keyup", keyUp);
      add("pointermove", pointerMove);
      add("pointerdown", pointerDown);
      add("pointerup", pointerUp);
      add("pointercancel", pointerUp);
      global.addEventListener("blur", reset);
      global.document.addEventListener("visibilitychange", visibilityChange);
    }

    function detach() {
      for (const [type, handler, listenerOptions] of listeners) {
        target.removeEventListener(type, handler, listenerOptions);
      }
      listeners.length = 0;
      global.removeEventListener("blur", reset);
      global.document.removeEventListener("visibilitychange", visibilityChange);
      attached = false;
      reset();
    }

    return Object.freeze({
      attach,
      detach,
      reset,
      isDown: function isDown(code) {
        return pressed.has(code);
      }
    });
  }

  function createResourceTracker() {
    const resources = new Set();
    function track(resource) {
      if (resource && (typeof resource.dispose === "function" || resource.isObject3D)) resources.add(resource);
      return resource;
    }
    function disposeMaterial(material) {
      if (!material) return;
      for (const value of Object.values(material)) {
        if (value && value.isTexture && typeof value.dispose === "function") value.dispose();
      }
      if (typeof material.dispose === "function") material.dispose();
    }
    function dispose() {
      for (const resource of resources) {
        if (resource.isObject3D) {
          resource.traverse(function disposeObject(object) {
            if (object.geometry && typeof object.geometry.dispose === "function") object.geometry.dispose();
            if (Array.isArray(object.material)) object.material.forEach(disposeMaterial);
            else disposeMaterial(object.material);
          });
          if (resource.parent) resource.parent.remove(resource);
        } else if (typeof resource.dispose === "function") {
          resource.dispose();
        }
      }
      resources.clear();
    }
    return Object.freeze({ track, dispose });
  }

  function installContextLifecycle(options) {
    const settings = options || {};
    const canvas = settings.canvas;
    if (!canvas) throw new Error("installContextLifecycle requires a renderer canvas");
    function contextLost(event) {
      event.preventDefault();
      if (typeof settings.onLost === "function") settings.onLost(event);
    }
    function contextRestored(event) {
      if (typeof settings.onRestored === "function") settings.onRestored(event);
    }
    canvas.addEventListener("webglcontextlost", contextLost, false);
    canvas.addEventListener("webglcontextrestored", contextRestored, false);
    return function disposeContextLifecycle() {
      canvas.removeEventListener("webglcontextlost", contextLost, false);
      canvas.removeEventListener("webglcontextrestored", contextRestored, false);
    };
  }

  function requireThree() {
    if (!global.THREE || typeof global.THREE.Vector3 !== "function") {
      throw new Error("LOBSTER_THREE_RUNTIME spatial helpers require the bundled THREE global");
    }
    return global.THREE;
  }

  function vectorFrom(value, fallback) {
    const THREE = requireThree();
    if (value && value.isVector3) return value.clone();
    if (Array.isArray(value) && value.length >= 3) {
      return new THREE.Vector3(Number(value[0]) || 0, Number(value[1]) || 0, Number(value[2]) || 0);
    }
    if (value && typeof value === "object") {
      return new THREE.Vector3(Number(value.x) || 0, Number(value.y) || 0, Number(value.z) || 0);
    }
    if (typeof value === "string") {
      const axis = value.trim().toLowerCase().replace(/^local\s+/, "").replace(/\s+/g, "");
      const sign = axis.startsWith("-") ? -1 : 1;
      const name = axis.replace(/^[+-]/, "");
      if (name === "x") return new THREE.Vector3(sign, 0, 0);
      if (name === "y") return new THREE.Vector3(0, sign, 0);
      if (name === "z") return new THREE.Vector3(0, 0, sign);
    }
    return fallback && fallback.isVector3
      ? fallback.clone()
      : new THREE.Vector3(fallback?.[0] || 0, fallback?.[1] || 0, fallback?.[2] || 0);
  }

  function normalizedVector(value, fallback, label) {
    const vector = vectorFrom(value, fallback);
    if (vector.lengthSq() < 1e-12) throw new Error(`${label} must be a non-zero vector`);
    return vector.normalize();
  }

  function choosePerpendicular(up) {
    const THREE = requireThree();
    const reference = Math.abs(up.y) < 0.9
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(0, 0, -1);
    return reference.addScaledVector(up, -reference.dot(up)).normalize();
  }

  function projectDirectionToPlane(direction, up, fallback) {
    const projected = direction.clone().addScaledVector(up, -direction.dot(up));
    if (projected.lengthSq() < 1e-12 && fallback) {
      projected.copy(fallback).addScaledVector(up, -fallback.dot(up));
    }
    if (projected.lengthSq() < 1e-12) projected.copy(choosePerpendicular(up));
    return projected.normalize();
  }

  function createSpatialFrame(options) {
    const settings = options || {};
    const up = normalizedVector(settings.worldUp, [0, 1, 0], "worldUp");
    const requestedForward = normalizedVector(settings.visualForward, [0, 0, -1], "visualForward");
    const forward = projectDirectionToPlane(requestedForward, up);
    const right = forward.clone().cross(up).normalize();
    forward.crossVectors(up, right).normalize();
    const modelForward = normalizedVector(settings.modelForward, [0, 0, -1], "modelForward");
    return Object.freeze({ up, forward, right, modelForward });
  }

  function directionFrom(source) {
    const THREE = requireThree();
    if (source && source.isVector3) return source.clone();
    if (source && typeof source.getWorldDirection === "function") {
      return source.getWorldDirection(new THREE.Vector3());
    }
    return vectorFrom(source, [0, 0, -1]);
  }

  function getPlanarFrame(directionSource, options) {
    const settings = options || {};
    const base = settings.frame || createSpatialFrame(settings);
    const fallback = settings.fallbackForward
      ? normalizedVector(settings.fallbackForward, base.forward, "fallbackForward")
      : base.forward;
    const forward = projectDirectionToPlane(directionFrom(directionSource), base.up, fallback);
    const right = forward.clone().cross(base.up).normalize();
    return Object.freeze({ up: base.up.clone(), forward, right, modelForward: base.modelForward.clone() });
  }

  function mapDirectionalInput(frame, input, target) {
    const THREE = requireThree();
    const values = input || {};
    const result = target && target.isVector3 ? target : new THREE.Vector3();
    result.set(0, 0, 0)
      .addScaledVector(frame.forward, Number(values.forward) || 0)
      .addScaledVector(frame.right, Number(values.right) || 0);
    const maximum = Number.isFinite(values.maximum) && values.maximum > 0 ? values.maximum : 1;
    if (result.lengthSq() > maximum * maximum) result.setLength(maximum);
    return result;
  }

  function resolveLocomotionFacing(frame, input, movementDirection, target) {
    const THREE = requireThree();
    const values = input || {};
    const result = target && target.isVector3 ? target : new THREE.Vector3();
    const movement = movementDirection?.isVector3
      ? movementDirection
      : mapDirectionalInput(frame, values);
    if ((Number(values.forward) || 0) < 0) return result.copy(frame.forward).normalize();
    if (movement.lengthSq() > 1e-12) return result.copy(movement).normalize();
    return result.copy(frame.forward).normalize();
  }

  function transformLocalDirection(object, localDirection, target) {
    const THREE = requireThree();
    if (!object || typeof object.getWorldQuaternion !== "function") {
      throw new Error("transformLocalDirection requires a Three.js Object3D");
    }
    const result = target && target.isVector3 ? target : new THREE.Vector3();
    const quaternion = object.getWorldQuaternion(new THREE.Quaternion());
    return result.copy(vectorFrom(localDirection, [0, 0, -1])).applyQuaternion(quaternion).normalize();
  }

  function faceDirection(object, desiredDirection, options) {
    const THREE = requireThree();
    if (!object || !object.quaternion) throw new Error("faceDirection requires a Three.js Object3D");
    const settings = options || {};
    const frame = settings.frame || createSpatialFrame(settings);
    let direction = normalizedVector(desiredDirection, frame.forward, "desiredDirection");
    if (settings.planar !== false) direction = projectDirectionToPlane(direction, frame.up, frame.forward);
    const localForward = normalizedVector(settings.modelForward, frame.modelForward, "modelForward");
    if (settings.apply === false) return new THREE.Quaternion().setFromUnitVectors(localForward, direction).normalize();
    if (object.parent && typeof object.parent.getWorldQuaternion === "function") {
      const parentInverse = object.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
      direction.applyQuaternion(parentInverse).normalize();
    }
    object.quaternion.setFromUnitVectors(localForward, direction).normalize();
    return object.quaternion;
  }

  function alignGeometryAxis(object, localGeometryAxis, targetAxis) {
    const THREE = requireThree();
    if (!object || !object.quaternion) throw new Error("alignGeometryAxis requires a Three.js Object3D");
    const source = normalizedVector(localGeometryAxis, [0, 1, 0], "localGeometryAxis");
    const target = normalizedVector(targetAxis, [0, 0, -1], "targetAxis");
    const correction = new THREE.Quaternion().setFromUnitVectors(source, target);
    object.quaternion.multiply(correction).normalize();
    return object.quaternion;
  }

  function screenPointToRay(camera, clientX, clientY, rect) {
    const THREE = requireThree();
    if (!camera) throw new Error("screenPointToRay requires a camera");
    const bounds = rect || camera?.renderer?.domElement?.getBoundingClientRect?.();
    if (!bounds || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height) || bounds.width <= 0 || bounds.height <= 0) {
      throw new Error("screenPointToRay requires a finite positive renderer rectangle");
    }
    const ndc = new THREE.Vector2(
      ((Number(clientX) - bounds.left) / bounds.width) * 2 - 1,
      -((Number(clientY) - bounds.top) / bounds.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, camera);
    return raycaster.ray.clone();
  }

  function relativePointerToRotation(movementX, movementY, options) {
    const settings = options || {};
    const sensitivity = Number.isFinite(settings.sensitivity) ? settings.sensitivity : 0.002;
    const horizontal = Number(movementX) || 0;
    const vertical = Number(movementY) || 0;
    return Object.freeze({
      yawDelta: -horizontal * sensitivity,
      pitchDelta: (settings.invertY ? vertical : -vertical) * sensitivity
    });
  }

  function dampScalar(current, target, rate, deltaSeconds) {
    if (!Number.isFinite(current)) return target;
    if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return current;
    return current + (target - current) * (1 - Math.exp(-rate * deltaSeconds));
  }

  function wrapAngle(value) {
    const turn = Math.PI * 2;
    return ((value + Math.PI) % turn + turn) % turn - Math.PI;
  }

  function dampAngle(current, target, rate, deltaSeconds) {
    return wrapAngle(current + dampScalar(0, wrapAngle(target - current), rate, deltaSeconds));
  }

  function createCameraRig(options) {
    const THREE = requireThree();
    const settings = options || {};
    const camera = settings.camera;
    if (!camera || !camera.position || typeof camera.lookAt !== "function") {
      throw new Error("createCameraRig requires a Three.js camera");
    }

    function defaultProfile(nextMode) {
      const mode = String(nextMode || settings.mode || "third-person-follow").toLowerCase();
      const firstPerson = mode.includes("first-person");
      return {
        mode, yaw: 0, pitch: 0, followSubjectHeading: false,
        minPitch: firstPerson ? -1.45 : -1,
        maxPitch: firstPerson ? 1.45 : 1,
        distance: firstPerson ? 0 : 6,
        height: firstPerson ? 1.6 : 1.2,
        focusHeight: firstPerson ? 0 : 1.2,
        lookAhead: 0, lookAheadMode: "control", focusOffset: [0, 0, 0], lateralOffset: 0, verticalOffset: 0,
        reticleSubject: null,
        sensitivity: Number.isFinite(settings.sensitivity) ? settings.sensitivity : 0.002,
        invertY: Boolean(settings.invertY)
      };
    }

    const defaults = defaultProfile(settings.mode);
    const frame = settings.frame || createSpatialFrame(settings);
    const collisionWorld = settings.collisionWorld || null;
    let subject = null;
    let reticleSubject = null;
    let reticleClearance = 0;
    const reticleCorners = Array.from({ length: 8 }, () => new THREE.Vector3());
    const reticleBounds = new THREE.Box3();
    const partBounds = new THREE.Box3();
    const inverseSubjectMatrix = new THREE.Matrix4();
    const partMatrix = new THREE.Matrix4();
    const framingPoint = new THREE.Vector3();
    let { mode, yaw: targetYaw, pitch: targetPitch, followSubjectHeading,
      minPitch: minimumPitch, maxPitch: maximumPitch, sensitivity, invertY, lookAheadMode } = defaults;
    let viewYaw = targetYaw;
    let viewPitch = targetPitch;
    const rotationResponseRate = Number.isFinite(settings.rotationResponseRate) && settings.rotationResponseRate > 0
      ? settings.rotationResponseRate
      : 24;
    const framing = {
      distance: defaults.distance,
      height: defaults.height,
      focusHeight: defaults.focusHeight,
      lookAhead: defaults.lookAhead,
      lateralOffset: defaults.lateralOffset,
      verticalOffset: defaults.verticalOffset
    };
    const obstructionRecoveryRate = Number.isFinite(settings.obstructionRecoveryRate) && settings.obstructionRecoveryRate > 0
      ? settings.obstructionRecoveryRate
      : 8;
    const obstructionLayer = settings.obstructionLayer ? String(settings.obstructionLayer) : "";
    const obstructionMargin = Number.isFinite(settings.obstructionMargin) && settings.obstructionMargin >= 0 ? settings.obstructionMargin : 0.05;
    const cameraRadius = Number.isFinite(settings.cameraRadius) && settings.cameraRadius >= 0 ? settings.cameraRadius : 0.25;
    const focusOffset = vectorFrom(defaults.focusOffset);
    const previousPosition = new THREE.Vector3();
    const currentPosition = new THREE.Vector3();
    const renderedPosition = new THREE.Vector3();
    const previousQuaternion = new THREE.Quaternion();
    const currentQuaternion = new THREE.Quaternion();
    const renderedQuaternion = new THREE.Quaternion();
    const controlForward = new THREE.Vector3();
    const movementForward = new THREE.Vector3();
    const movementRight = new THREE.Vector3();
    const movementFrame = Object.freeze({ up: frame.up, forward: movementForward, right: movementRight });
    const subjectForward = new THREE.Vector3();
    const boomOrigin = new THREE.Vector3();
    const focus = new THREE.Vector3();
    const basePosition = new THREE.Vector3();
    const rawOffset = new THREE.Vector3();
    const viewTargetOffset = new THREE.Vector3();
    const viewUp = new THREE.Vector3();
    const rayDirection = new THREE.Vector3();
    const controlRight = new THREE.Vector3();
    const viewDirection = new THREE.Vector3();
    const renderedViewDirection = new THREE.Vector3();
    const shakeOffset = new THREE.Vector3();
    let hasRenderedView = false;
    let initialized = false;
    let currentBoomLength = NaN;
    let obstructionActive = false;
    let renderTime = 0;
    let shakeAmplitude = 0;
    let shakeRemaining = 0;
    let shakeDuration = 0;

    function readSubjectPose(position, quaternion) {
      if (!subject || typeof subject.getWorldPosition !== "function" || typeof subject.getWorldQuaternion !== "function") return false;
      if (typeof subject.updateWorldMatrix === "function") subject.updateWorldMatrix(true, false);
      subject.getWorldPosition(position);
      subject.getWorldQuaternion(quaternion);
      return true;
    }

    function refreshReticleBounds() {
      reticleBounds.makeEmpty();
      if (!reticleSubject || !subject) return false;
      let ancestor = reticleSubject;
      while (ancestor && ancestor !== subject) ancestor = ancestor.parent;
      if (!ancestor) throw new Error("reticleSubject must belong to the tracked subject");
      subject.updateWorldMatrix(true, true);
      inverseSubjectMatrix.copy(subject.matrixWorld).invert();
      // Capture all attached visual variants, including hidden equipment, once.
      // Animation never changes this envelope unless the caller refreshes it.
      reticleSubject.traverse(function (part) {
        if (!part.geometry) return;
        if (typeof part.computeBoundingBox === "function") part.computeBoundingBox();
        else if (!part.geometry.boundingBox) part.geometry.computeBoundingBox();
        const bounds = part.boundingBox || part.geometry.boundingBox;
        if (!bounds) return;
        partMatrix.multiplyMatrices(inverseSubjectMatrix, part.matrixWorld);
        reticleBounds.union(partBounds.copy(bounds).applyMatrix4(partMatrix));
      });
      if (reticleBounds.isEmpty()) throw new Error("reticleSubject requires bounded visual geometry");
      let index = 0;
      for (const x of [reticleBounds.min.x, reticleBounds.max.x]) {
        for (const y of [reticleBounds.min.y, reticleBounds.max.y]) {
          for (const z of [reticleBounds.min.z, reticleBounds.max.z]) reticleCorners[index++].set(x, y, z);
        }
      }
      reticleBounds.getSize(framingPoint);
      reticleClearance = Math.max(framingPoint.x, framingPoint.y, framingPoint.z) * 0.08;
      return true;
    }

    function snapSubject() {
      if (!readSubjectPose(currentPosition, currentQuaternion)) return false;
      hasRenderedView = false;
      previousPosition.copy(currentPosition);
      previousQuaternion.copy(currentQuaternion);
      initialized = true;
      if (followSubjectHeading) syncSubjectHeading(currentQuaternion);
      currentBoomLength = NaN;
      obstructionActive = false;
      clearShake();
      return true;
    }

    function syncSubjectHeading(quaternion) {
      subjectForward.copy(frame.modelForward).applyQuaternion(quaternion);
      subjectForward.addScaledVector(frame.up, -subjectForward.dot(frame.up));
      if (subjectForward.lengthSq() < 1e-12) return false;
      subjectForward.normalize();
      targetYaw = wrapAngle(Math.atan2(
        -subjectForward.dot(frame.right),
        subjectForward.dot(frame.forward)
      ));
      return true;
    }

    function setSubject(nextSubject, transitionOptions) {
      const transition = transitionOptions || {};
      subject = nextSubject || null;
      initialized = false;
      hasRenderedView = false;
      if (transition.profile && typeof transition.profile === "object") {
        // A mode entry is a replacement; configure() remains an incremental adjustment.
        const profile = transition.profile;
        const overrides = Object.fromEntries(Object.entries(profile).filter(([, value]) => value !== undefined));
        configure(Object.assign(defaultProfile(profile.mode), overrides));
      }
      if (transition.followSubjectHeading !== undefined) {
        followSubjectHeading = Boolean(transition.followSubjectHeading);
      }
      if (!transition.profile) refreshReticleBounds();
      if (subject && snapSubject() && transition.alignYaw && !followSubjectHeading) {
        syncSubjectHeading(currentQuaternion);
      }
      if (transition.snap) snapView();
      return subject;
    }

    function snapView() {
      viewYaw = targetYaw;
      viewPitch = targetPitch;
      currentBoomLength = NaN;
      obstructionActive = false;
      clearShake();
    }

    function fixedUpdate() {
      if (!subject) return false;
      if (!initialized) return snapSubject();
      previousPosition.copy(currentPosition);
      previousQuaternion.copy(currentQuaternion);
      const updated = readSubjectPose(currentPosition, currentQuaternion);
      if (updated && followSubjectHeading) syncSubjectHeading(currentQuaternion);
      return updated;
    }

    function configure(nextOptions, controlOptions) {
      const next = nextOptions || {};
      const nextMinimumPitch = Number.isFinite(next.minPitch) ? next.minPitch : minimumPitch;
      const nextMaximumPitch = Number.isFinite(next.maxPitch) ? next.maxPitch : maximumPitch;
      if (nextMinimumPitch > nextMaximumPitch) throw new Error("camera minPitch must not exceed maxPitch");
      if (next.mode !== undefined) mode = String(next.mode).toLowerCase();
      if (next.followSubjectHeading !== undefined) followSubjectHeading = Boolean(next.followSubjectHeading);
      if (next.lookAheadMode !== undefined) lookAheadMode = next.lookAheadMode === "subject" ? "subject" : "control";
      minimumPitch = nextMinimumPitch;
      maximumPitch = nextMaximumPitch;
      if (Number.isFinite(next.sensitivity)) sensitivity = next.sensitivity;
      if (next.invertY !== undefined) invertY = Boolean(next.invertY);
      if (Number.isFinite(next.yaw)) targetYaw = wrapAngle(next.yaw);
      if (Number.isFinite(next.pitch)) targetPitch = next.pitch;
      if (next.focusOffset !== undefined) focusOffset.copy(vectorFrom(next.focusOffset, [0, 0, 0]));
      for (const key of Object.keys(framing)) {
        if (Number.isFinite(next[key])) framing[key] = key === "distance" ? Math.max(0, next[key]) : next[key];
      }
      if (next.reticleSubject !== undefined) {
        if (next.reticleSubject !== null && (!next.reticleSubject.isObject3D || !camera.isPerspectiveCamera)) {
          throw new Error("reticleSubject requires an Object3D and perspective camera");
        }
        reticleSubject = next.reticleSubject;
        refreshReticleBounds();
      }
      targetPitch = Math.min(maximumPitch, Math.max(minimumPitch, targetPitch));
      viewPitch = Math.min(maximumPitch, Math.max(minimumPitch, viewPitch));
      if (controlOptions?.snap) snapView();
    }

    function addPointerDelta(movementX, movementY) {
      if (followSubjectHeading) return { yaw: targetYaw, pitch: targetPitch };
      const rotation = relativePointerToRotation(movementX, movementY, {
        sensitivity,
        invertY
      });
      targetYaw = wrapAngle(targetYaw + rotation.yawDelta);
      targetPitch = Math.min(maximumPitch, Math.max(minimumPitch, targetPitch + rotation.pitchDelta));
      return { yaw: targetYaw, pitch: targetPitch };
    }

    function updateControlForward(target) {
      const result = target || controlForward;
      result.copy(frame.forward).applyAxisAngle(frame.up, viewYaw);
      result.addScaledVector(frame.up, -result.dot(frame.up));
      if (result.lengthSq() < 1e-12) result.copy(frame.forward);
      return result.normalize();
    }

    function updateViewForward(target) {
      const result = updateControlForward(target || viewDirection);
      const opticalPitch = mode.includes("first-person")
        ? viewPitch
        : viewPitch - Math.atan2(framing.height, framing.distance);
      return result.multiplyScalar(Math.cos(opticalPitch)).addScaledVector(frame.up, Math.sin(opticalPitch)).normalize();
    }

    function getControlFrame() {
      updateControlForward(movementForward);
      movementRight.crossVectors(movementForward, frame.up).normalize();
      return movementFrame;
    }

    function addShake(amplitude, duration) {
      const value = Number(amplitude);
      if (!Number.isFinite(value) || value <= 0) return;
      const nextDuration = Number.isFinite(duration) && duration > 0 ? duration : 0.25;
      const currentValue = shakeDuration > 0
        ? shakeAmplitude * Math.min(1, shakeRemaining / shakeDuration)
        : 0;
      if (value < currentValue) return;
      shakeAmplitude = value;
      shakeDuration = nextDuration;
      shakeRemaining = nextDuration;
    }

    function clearShake() {
      shakeAmplitude = 0;
      shakeRemaining = 0;
      shakeDuration = 0;
      shakeOffset.set(0, 0, 0);
    }

    function render(alpha, renderDeltaSeconds) {
      if (!initialized && !snapSubject()) return null;
      const blend = Math.min(1, Math.max(0, Number(alpha) || 0));
      const deltaSeconds = Math.min(0.25, Math.max(0, Number(renderDeltaSeconds) || 0));
      renderTime += deltaSeconds;
      viewYaw = dampAngle(viewYaw, targetYaw, rotationResponseRate, deltaSeconds);
      viewPitch = dampScalar(viewPitch, targetPitch, rotationResponseRate, deltaSeconds);
      renderedPosition.lerpVectors(previousPosition, currentPosition, blend);
      renderedQuaternion.slerpQuaternions(previousQuaternion, currentQuaternion, blend);
      updateControlForward(controlForward);

      subjectForward.copy(frame.modelForward).applyQuaternion(renderedQuaternion);
      subjectForward.addScaledVector(frame.up, -subjectForward.dot(frame.up));
      if (subjectForward.lengthSq() < 1e-12) subjectForward.copy(controlForward);
      else subjectForward.normalize();
      const lookDirection = lookAheadMode === "subject" ? subjectForward : controlForward;

      if (mode.includes("first-person")) {
        basePosition.copy(renderedPosition).add(focusOffset).addScaledVector(frame.up, framing.height);
        updateViewForward(viewDirection);
        focus.copy(basePosition).add(viewDirection);
        currentBoomLength = 0;
      } else {
        const autoFraming = reticleSubject !== null && !reticleBounds.isEmpty();
        boomOrigin.copy(renderedPosition).add(focusOffset).addScaledVector(frame.up, framing.focusHeight);
        focus.copy(boomOrigin).addScaledVector(lookDirection, autoFraming ? 0 : framing.lookAhead);
        updateViewForward(viewDirection);
        rawOffset.copy(viewDirection).multiplyScalar(-Math.hypot(framing.distance, framing.height));
        const hasViewOffset = autoFraming || framing.lateralOffset !== 0 || framing.verticalOffset !== 0;
        if (hasViewOffset) {
          // Pan camera and target together in the view frame. Keep the safe
          // collision anchor on the subject, not at the displaced camera pivot.
          viewTargetOffset.subVectors(focus, boomOrigin).sub(rawOffset);
          controlRight.crossVectors(viewTargetOffset, frame.up);
          if (controlRight.lengthSq() < 1e-12) controlRight.crossVectors(controlForward, frame.up);
          controlRight.normalize();
          viewUp.crossVectors(controlRight, viewTargetOffset).normalize();
          let verticalOffset = framing.verticalOffset;
          if (autoFraming) {
            verticalOffset = 0;
            for (const corner of reticleCorners) {
              framingPoint.copy(corner).applyQuaternion(renderedQuaternion).add(renderedPosition).sub(boomOrigin);
              verticalOffset = Math.max(verticalOffset, framingPoint.dot(viewUp) + reticleClearance);
            }
            // Fit the same envelope into the perspective view with a small edge
            // margin. Only extend the requested boom; collision remains authoritative.
            const tanVertical = Math.tan(camera.getEffectiveFOV() * Math.PI / 360) * 0.9;
            const tanHorizontal = tanVertical * camera.aspect;
            let distance = rawOffset.length();
            for (const corner of reticleCorners) {
              framingPoint.copy(corner).applyQuaternion(renderedQuaternion).add(renderedPosition).sub(boomOrigin);
              const depth = framingPoint.dot(viewDirection);
              distance = Math.max(distance, camera.near + reticleClearance - depth,
                Math.abs(framingPoint.dot(controlRight)) / tanHorizontal - depth,
                Math.abs(framingPoint.dot(viewUp) - verticalOffset) / tanVertical - depth);
            }
            rawOffset.copy(viewDirection).multiplyScalar(-distance);
          }
          rawOffset.addScaledVector(controlRight, autoFraming ? 0 : framing.lateralOffset);
          rawOffset.addScaledVector(viewUp, verticalOffset);
        }
        const rawLength = rawOffset.length();
        let allowedLength = rawLength;
        let obstructed = false;
        if (collisionWorld && typeof collisionWorld.raycast === "function" && rawLength > 1e-9) {
          const query = { includeTriggers: false, ignoreOwner: subject };
          if (obstructionLayer) query.layer = obstructionLayer;
          rayDirection.copy(rawOffset).normalize();
          const hit = cameraRadius > 0 && typeof collisionWorld.sphereCast === "function"
            ? collisionWorld.sphereCast(boomOrigin, rayDirection, rawLength, cameraRadius, query)
            : collisionWorld.raycast(boomOrigin, rayDirection, rawLength, query);
          if (hit) {
            allowedLength = Math.min(rawLength, Math.max(0, hit.distance - obstructionMargin));
            obstructed = allowedLength < rawLength;
          }
        }
        if (!Number.isFinite(currentBoomLength)) currentBoomLength = allowedLength;
        else if (obstructed || allowedLength < currentBoomLength) currentBoomLength = allowedLength;
        else if (obstructionActive && currentBoomLength < allowedLength) {
          currentBoomLength = dampScalar(currentBoomLength, allowedLength, obstructionRecoveryRate, deltaSeconds);
        } else currentBoomLength = allowedLength;
        obstructionActive = obstructed || (obstructionActive && currentBoomLength < allowedLength - 1e-4);
        basePosition.copy(boomOrigin);
        if (rawLength > 1e-9) basePosition.addScaledVector(rawOffset, currentBoomLength / rawLength);
        // Collision may retract both the boom and its view-plane offsets. Keep
        // the intended optical direction instead of turning toward the subject.
        if (hasViewOffset) focus.copy(basePosition).add(viewTargetOffset);
      }

      shakeOffset.set(0, 0, 0);
      if (shakeRemaining > 0 && shakeAmplitude > 0) {
        const decay = shakeDuration > 0 ? shakeRemaining / shakeDuration : 0;
        controlRight.crossVectors(controlForward, frame.up).normalize();
        shakeOffset.addScaledVector(controlRight, Math.sin(renderTime * 53) * shakeAmplitude * decay);
        shakeOffset.addScaledVector(frame.up, Math.sin(renderTime * 71) * shakeAmplitude * decay * 0.45);
        shakeRemaining = Math.max(0, shakeRemaining - deltaSeconds);
        if (shakeRemaining === 0) shakeAmplitude = 0;
      }
      camera.up.copy(frame.up);
      camera.position.copy(basePosition).add(shakeOffset);
      renderedViewDirection.subVectors(focus, camera.position);
      if (renderedViewDirection.lengthSq() < 1e-12) {
        // A fully retracted boom still needs a defined view, not lookAt(position).
        updateViewForward(renderedViewDirection);
        focus.copy(camera.position).add(renderedViewDirection);
      } else renderedViewDirection.normalize();
      camera.lookAt(focus);
      hasRenderedView = true;
      return camera;
    }

    configure(settings, { snap: true });
    if (settings.subject) setSubject(settings.subject);
    return Object.freeze({
      setSubject,
      fixedUpdate,
      configure,
      refreshReticleBounds,
      addPointerDelta,
      getControlFrame,
      getViewForward: function getViewForward(target) {
        const result = target || new THREE.Vector3();
        return hasRenderedView ? result.copy(renderedViewDirection) : updateViewForward(result);
      },
      addShake,
      clearShake,
      render,
      snap: snapSubject
    });
  }

  function colliderPosition(options) {
    const THREE = requireThree();
    if (options?.position?.isVector3) return options.position;
    if (options?.owner?.position?.isVector3) return options.owner.position;
    return vectorFrom(options?.position, [0, 0, 0]) || new THREE.Vector3();
  }

  let colliderSequence = 0;

  function normalizeCollisionMask(mask) {
    if (mask === "*") return "*";
    if (Array.isArray(mask) || Object.prototype.toString.call(mask) === "[object Set]") {
      return new Set(Array.from(mask, String));
    }
    if (mask == null) return new Set(["default"]);
    throw new TypeError("Collision mask must be an array, Set, or '*'");
  }

  function createColliderBase(shape, options) {
    const settings = options || {};
    colliderSequence += 1;
    return {
      id: String(settings.id || `${shape}-${colliderSequence}`),
      shape,
      owner: settings.owner || null,
      position: colliderPosition(settings),
      offset: vectorFrom(settings.localOffset ?? settings.offset, [0, 0, 0]),
      orientation: settings.orientation?.isQuaternion
        ? settings.orientation
        : (settings.owner?.quaternion?.isQuaternion ? settings.owner.quaternion : null),
      layer: String(settings.layer || "default"),
      mask: normalizeCollisionMask(settings.mask),
      isTrigger: Boolean(settings.isTrigger),
      enabled: settings.enabled !== false,
      userData: settings.userData || null
    };
  }

  function createBoxCollider(options) {
    const settings = options || {};
    const collider = createColliderBase("box", settings);
    const size = vectorFrom(settings.localSize ?? settings.size, [1, 1, 1]);
    const halfExtents = settings.localHalfExtents ?? settings.halfExtents;
    collider.halfExtents = halfExtents
      ? vectorFrom(halfExtents, [0.5, 0.5, 0.5])
      : size.multiplyScalar(0.5);
    collider.halfExtents.set(
      Math.abs(collider.halfExtents.x),
      Math.abs(collider.halfExtents.y),
      Math.abs(collider.halfExtents.z)
    );
    return collider;
  }

  function createSphereCollider(options) {
    const settings = options || {};
    const collider = createColliderBase("sphere", settings);
    collider.radius = Number.isFinite(settings.radius) && settings.radius > 0 ? settings.radius : 0.5;
    return collider;
  }

  function createCapsuleCollider(options) {
    const settings = options || {};
    const collider = createColliderBase("capsule", settings);
    collider.radius = Number.isFinite(settings.radius) && settings.radius > 0 ? settings.radius : 0.5;
    collider.halfHeight = Number.isFinite(settings.halfHeight) && settings.halfHeight >= 0
      ? settings.halfHeight
      : Math.max(0, ((Number(settings.height) || 2) * 0.5) - collider.radius);
    collider.axis = normalizedVector(settings.axis, [0, 1, 0], "capsule axis");
    return collider;
  }

  function createPrimitiveCollider(options) {
    const settings = options || {};
    const shape = String(settings.shape || "box").toLowerCase();
    if (shape === "sphere") return createSphereCollider(settings);
    if (shape === "capsule") return createCapsuleCollider(settings);
    if (shape !== "box") throw new Error(`Unsupported collider shape: ${shape}`);
    return createBoxCollider(settings);
  }

  function createTriggerCollider(options) {
    return createPrimitiveCollider(Object.assign({}, options, { isTrigger: true }));
  }

  function maskContains(mask, layer) {
    return mask === "*" || mask.has(layer);
  }

  function collidersCanInteract(first, second) {
    return first !== second
      && first.enabled
      && second.enabled
      && maskContains(first.mask, second.layer)
      && maskContains(second.mask, first.layer);
  }

  function colliderOrientation(collider, override) {
    const THREE = requireThree();
    if (override?.isQuaternion) return override.clone().normalize();
    if (collider.authoritativeOrientation) return collider.authoritativeOrientation.clone();
    if (collider.orientation && collider.orientation !== collider.owner?.quaternion) return collider.orientation.clone().normalize();
    if (collider.owner && typeof collider.owner.getWorldQuaternion === "function") {
      return collider.owner.getWorldQuaternion(new THREE.Quaternion());
    }
    return collider.orientation?.isQuaternion ? collider.orientation.clone() : new THREE.Quaternion();
  }

  function colliderWorldPosition(collider, override) {
    const THREE = requireThree();
    if (override?.isVector3) return override.clone();
    return collider.position === collider.owner?.position
      ? collider.owner.getWorldPosition(new THREE.Vector3()) : collider.position.clone();
  }

  function colliderGeometry(collider, positionOverride, orientationOverride) {
    const THREE = requireThree();
    const orientation = colliderOrientation(collider, orientationOverride);
    const position = colliderWorldPosition(collider, positionOverride);
    const center = position.add(collider.offset.clone().applyQuaternion(orientation));
    const axes = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)]
      .map((axis) => axis.applyQuaternion(orientation));
    const half = collider.shape === "box" ? collider.halfExtents : new THREE.Vector3();
    const segment = collider.shape === "capsule"
      ? collider.axis.clone().applyQuaternion(orientation).multiplyScalar(collider.halfHeight) : new THREE.Vector3();
    const radius = collider.shape === "box" ? 0 : collider.radius;
    const extents = new THREE.Vector3(radius, radius, radius);
    for (let i = 0; i < 3; i += 1) {
      const axis = axes[i];
      const extent = half.getComponent(i);
      extents.x += Math.abs(axis.x) * extent;
      extents.y += Math.abs(axis.y) * extent;
      extents.z += Math.abs(axis.z) * extent;
    }
    extents.x += Math.abs(segment.x);
    extents.y += Math.abs(segment.y);
    extents.z += Math.abs(segment.z);
    return { shape: collider.shape, center, axes, half, segment, radius,
      min: center.clone().sub(extents), max: center.clone().add(extents) };
  }

  function aabbOverlap(first, second) {
    return first.max.x > second.min.x && first.min.x < second.max.x
      && first.max.y > second.min.y && first.min.y < second.max.y
      && first.max.z > second.min.z && first.min.z < second.max.z;
  }

  function projectedRadius(shape, normal) {
    return shape.radius + Math.abs(shape.segment.dot(normal))
      + shape.axes.reduce((sum, axis, index) => sum + Math.abs(axis.dot(normal)) * shape.half.getComponent(index), 0);
  }

  function axisSeparation(first, second, axes) {
    const offset = first.center.clone().sub(second.center);
    let best = { distance: -Infinity, normal: first.axes[0].clone() };
    for (const axis of axes) {
      if (axis.lengthSq() < 1e-16) continue;
      const normal = axis.clone().normalize();
      const projection = offset.dot(normal);
      const distance = Math.abs(projection) - projectedRadius(first, normal) - projectedRadius(second, normal);
      if (distance > best.distance) best = { distance, normal: normal.multiplyScalar(projection < 0 ? -1 : 1) };
    }
    return best;
  }

  function closestSegmentPoints(first, second) {
    const a = first.center.clone().sub(first.segment);
    const b = second.center.clone().sub(second.segment);
    const u = first.segment.clone().multiplyScalar(2);
    const v = second.segment.clone().multiplyScalar(2);
    const w = a.clone().sub(b);
    const uu = u.dot(u), vv = v.dot(v), uv = u.dot(v), uw = u.dot(w), vw = v.dot(w);
    const clamp = (value) => Math.max(0, Math.min(1, value));
    let s = 0, t = 0;
    if (uu <= 1e-16) t = vv > 1e-16 ? clamp(vw / vv) : 0;
    else if (vv <= 1e-16) s = clamp(-uw / uu);
    else {
      const denominator = uu * vv - uv * uv;
      s = denominator > 1e-16 ? clamp((uv * vw - uw * vv) / denominator) : 0;
      t = (uv * s + vw) / vv;
      if (t < 0) { t = 0; s = clamp(-uw / uu); }
      else if (t > 1) { t = 1; s = clamp((uv - uw) / uu); }
    }
    return [a.addScaledVector(u, s), b.addScaledVector(v, t)];
  }

  function closestSegmentBoxPoints(rounded, box) {
    const THREE = requireThree();
    const offset = rounded.center.clone().sub(box.center).sub(rounded.segment);
    const start = new THREE.Vector3(...box.axes.map((axis) => offset.dot(axis)));
    const delta = new THREE.Vector3(...box.axes.map((axis) => 2 * rounded.segment.dot(axis)));
    // Distance to a box is piecewise quadratic along a segment; face crossings delimit each piece.
    const cuts = [0, 1];
    for (let i = 0; i < 3; i += 1) {
      if (Math.abs(delta.getComponent(i)) < 1e-12) continue;
      for (const sign of [-1, 1]) {
        const time = (sign * box.half.getComponent(i) - start.getComponent(i)) / delta.getComponent(i);
        if (time > 0 && time < 1) cuts.push(time);
      }
    }
    cuts.sort((a, b) => a - b);
    let bestDistance = Infinity, bestPoint, bestBoxPoint;
    function sample(time) {
      const point = start.clone().addScaledVector(delta, time);
      const boxPoint = point.clone().clamp(box.half.clone().negate(), box.half);
      const distance = point.distanceToSquared(boxPoint);
      if (distance < bestDistance) { bestDistance = distance; bestPoint = point; bestBoxPoint = boxPoint; }
    }
    cuts.forEach(sample);
    for (let j = 1; j < cuts.length; j += 1) {
      const middle = (cuts[j - 1] + cuts[j]) * 0.5;
      let numerator = 0, denominator = 0;
      for (let i = 0; i < 3; i += 1) {
        const value = start.getComponent(i) + delta.getComponent(i) * middle;
        const half = box.half.getComponent(i);
        if (Math.abs(value) <= half) continue;
        numerator += delta.getComponent(i) * (start.getComponent(i) - Math.sign(value) * half);
        denominator += delta.getComponent(i) ** 2;
      }
      if (denominator > 0) sample(Math.max(cuts[j - 1], Math.min(cuts[j], -numerator / denominator)));
    }
    const toWorld = (point) => box.axes.reduce((result, axis, i) => result.addScaledVector(axis, point.getComponent(i)), box.center.clone());
    return [toWorld(bestPoint), toWorld(bestBoxPoint)];
  }

  function shapeSeparation(first, second) {
    if (first.shape === "box" && second.shape === "box") {
      return axisSeparation(first, second, [...first.axes, ...second.axes,
        ...first.axes.flatMap((a) => second.axes.map((b) => a.clone().cross(b)))]);
    }
    if (first.shape === "box") {
      const result = shapeSeparation(second, first);
      result.normal.negate();
      return result;
    }
    const points = second.shape === "box" ? closestSegmentBoxPoints(first, second) : closestSegmentPoints(first, second);
    const normal = points[0].sub(points[1]);
    const distance = normal.length();
    if (distance > 1e-10) return { distance: distance - first.radius - second.radius, normal: normal.divideScalar(distance) };
    // Intersecting core segments have no closest-point normal. A separating projection
    // supplies a finite recovery direction, including fully contained spheres/capsules.
    const axes = second.shape === "box"
      ? [...second.axes, ...second.axes.map((axis) => axis.clone().cross(first.segment))]
      : [first.segment.clone().cross(second.segment), first.center.clone().sub(second.center),
        choosePerpendicular(first.segment.lengthSq() > 1e-16 ? first.segment.clone().normalize()
          : second.segment.lengthSq() > 1e-16 ? second.segment.clone().normalize() : first.axes[1])];
    return axisSeparation(first, second, axes);
  }

  function segmentAabbInterval(start, delta, minimum, maximum) {
    let near = 0;
    let far = 1;
    for (const axis of ["x", "y", "z"]) {
      const origin = start[axis];
      const movement = delta[axis];
      if (Math.abs(movement) < 1e-12) {
        if (origin < minimum[axis] || origin > maximum[axis]) return null;
        continue;
      }
      let first = (minimum[axis] - origin) / movement;
      let second = (maximum[axis] - origin) / movement;
      if (first > second) {
        const swap = first;
        first = second;
        second = swap;
      }
      near = Math.max(near, first);
      far = Math.min(far, second);
      if (near > far) return null;
    }
    return near <= 1 && far >= 0 ? { near, far } : null;
  }

  function rotationEscapeTime(shape, other, pivot, delta, axis, angle, normal) {
    let points = [shape.center.clone()];
    if (shape.shape === "box") {
      for (let i = 0; i < 3; i += 1) {
        points = points.flatMap((point) => [-1, 1].map((sign) => point.clone()
          .addScaledVector(shape.axes[i], sign * shape.half.getComponent(i))));
      }
    } else if (shape.shape === "capsule") points = [shape.center.clone().add(shape.segment), shape.center.clone().sub(shape.segment)];
    const plane = other.center.dot(normal) + projectedRadius(other, normal) + shape.radius;
    const normalRadius = axis.clone().cross(normal).length();
    let safeTime = Infinity;
    for (const point of points) {
      const offset = point.clone().sub(pivot);
      const gap = Math.max(0, point.dot(normal) - plane);
      const speed = delta.dot(normal) + angle * axis.clone().cross(offset).dot(normal);
      const accelerationBound = angle * angle * axis.clone().cross(offset).length() * normalRadius;
      let time = Infinity;
      if (accelerationBound < 1e-12) time = speed < -1e-12 ? gap / -speed : Infinity;
      else if (gap === 0 && Math.abs(speed) < 1e-12) {
        const acceleration = angle * angle * (axis.dot(offset) * axis.dot(normal) - offset.dot(normal));
        time = acceleration > 0 ? acceleration / (angle * accelerationBound) : 0;
      } else {
        const root = Math.sqrt(speed * speed + 2 * accelerationBound * gap);
        time = speed < 0 ? 2 * gap / (root - speed) : (speed + root) / accelerationBound;
      }
      safeTime = Math.min(safeTime, time);
    }
    return safeTime;
  }

  function castShape(collider, from, delta, orientations, other, initialOverlap) {
    const THREE = requireThree();
    const startShape = colliderGeometry(collider, from, orientations.from);
    const rotation = orientations.to.clone().multiply(orientations.from.clone().invert()).normalize();
    if (rotation.w < 0) rotation.set(-rotation.x, -rotation.y, -rotation.z, -rotation.w);
    const angle = 2 * Math.acos(Math.max(-1, Math.min(1, rotation.w)));
    const axis = new THREE.Vector3(rotation.x, rotation.y, rotation.z);
    if (axis.lengthSq() > 1e-16) axis.normalize();
    const rotating = angle > 1e-10;
    const reach = collider.offset.length() + (collider.shape === "box" ? collider.halfExtents.length()
      : collider.shape === "capsule" ? collider.halfHeight + collider.radius : 0);
    const sweptRadius = reach + (collider.shape === "sphere" ? collider.radius : 0);
    const extents = rotating ? new THREE.Vector3(sweptRadius, sweptRadius, sweptRadius) : startShape.max.clone().sub(startShape.center);
    // Broad phase encloses the entire swept shape, including an offset rotating around its root.
    const interval = segmentAabbInterval(rotating ? from : startShape.center, delta,
      other.min.clone().sub(extents), other.max.clone().add(extents));
    if (!interval) return null;
    let time = interval.near;
    let separation;
    for (let iteration = 0; iteration < 64; iteration += 1) {
      const orientation = orientations.from.clone().slerp(orientations.to, time);
      const shape = colliderGeometry(collider, from.clone().addScaledVector(delta, time), orientation);
      separation = shapeSeparation(shape, other);
      const angularClosing = rotating ? angle * reach * axis.clone().cross(separation.normal).length() : 0;
      const closing = -delta.dot(separation.normal) + angularClosing;
      if (separation.distance <= 1e-7) {
        if (time === 0 && !initialOverlap && separation.distance >= -1e-7) {
          if (closing <= 1e-12) return null;
          if (rotating) {
            // A body touching a wall must still be able to turn away. Certify a
            // separating-plane interval for every core vertex, not just the endpoint pose.
            const escape = rotationEscapeTime(shape, other, from, delta, axis, angle, separation.normal);
            if (escape > interval.far) return null;
            if (escape > 1e-12) { time = escape; continue; }
          }
        }
        return { time, normal: separation.normal };
      }
      if (closing <= 1e-12) return null;
      // A separating plane gives a conservative lower bound on time to contact.
      const advance = separation.distance / closing;
      if (time + advance > interval.far + 1e-12) return null;
      const nextTime = Math.min(interval.far, time + advance);
      if (nextTime <= time) break;
      time = nextTime;
    }
    // Never turn an iteration limit into an impact or silently advance through a blocker.
    return { time, normal: separation.normal, limited: true };
  }

  function createCollisionWorld(options) {
    const THREE = requireThree();
    const settings = options || {};
    const colliders = new Set();
    const skinWidth = Number.isFinite(settings.skinWidth) && settings.skinWidth >= 0 ? settings.skinWidth : 0.001;
    const defaultIterations = Number.isInteger(settings.maxIterations) && settings.maxIterations > 0 ? settings.maxIterations : 4;

    function add(collider) {
      if (!collider || !collider.shape) throw new Error("collisionWorld.add requires a collider");
      if (!["box", "sphere", "capsule"].includes(collider.shape)) throw new Error(`Unsupported collider shape: ${collider.shape}`);
      if (collider.owner?.getWorldScale) {
        const scale = collider.owner.getWorldScale(new THREE.Vector3());
        if (scale.distanceToSquared(new THREE.Vector3(1, 1, 1)) > 1e-12) {
          throw new Error("Collision roots require unit world scale; bake size into body dimensions and scale visual children instead");
        }
      }
      colliders.add(collider);
      return collider;
    }

    function addSolid(solidOptions) {
      const solid = Object.assign({}, solidOptions || {});
      solid.isTrigger = false;
      if (solid.layer === undefined) solid.layer = "solid";
      if (solid.mask === undefined) solid.mask = "*";
      const collider = createPrimitiveCollider(solid);
      collider.position = colliderWorldPosition(collider);
      collider.authoritativePosition = collider.position.clone();
      collider.authoritativeOrientation = colliderOrientation(collider);
      return add(collider);
    }

    function addTrigger(triggerOptions) {
      const trigger = Object.assign({}, triggerOptions || {}, { isTrigger: true });
      if (trigger.layer === undefined) trigger.layer = "trigger";
      if (trigger.mask === undefined) trigger.mask = "*";
      return add(createPrimitiveCollider(trigger));
    }

    function remove(collider) {
      return colliders.delete(collider);
    }

    function clear() {
      colliders.clear();
    }

    function candidatesFor(collider, includeTriggers) {
      return [...colliders].filter((other) => collidersCanInteract(collider, other) && (includeTriggers || !other.isTrigger));
    }

    function queryOverlap(collider, positionOverride, queryOptions) {
      const query = queryOptions || {};
      const shape = colliderGeometry(collider, positionOverride, query.orientation);
      const overlaps = [];
      for (const other of candidatesFor(collider, query.includeTriggers !== false)) {
        const otherShape = colliderGeometry(other);
        if (!aabbOverlap(shape, otherShape)) continue;
        const separation = shapeSeparation(shape, otherShape);
        if (separation.distance < -1e-7) overlaps.push({ collider: other, depth: -separation.distance, normal: separation.normal });
      }
      return overlaps;
    }

    function sweep(collider, fromPosition, toPosition, queryOptions) {
      const query = queryOptions || {};
      const from = colliderWorldPosition(collider, fromPosition);
      const to = toPosition && toPosition.isVector3 ? toPosition : from;
      const delta = to.clone().sub(from);
      const fromOrientation = colliderOrientation(collider, query.fromOrientation);
      const orientations = { from: fromOrientation, to: colliderOrientation(collider, query.orientation || fromOrientation) };
      let nearest = null;
      for (const other of candidatesFor(collider, Boolean(query.includeTriggers))) {
        const hit = castShape(collider, from, delta, orientations, colliderGeometry(other), false);
        if (hit && (!nearest || hit.time < nearest.time)) nearest = Object.assign({ collider: other }, hit);
      }
      return nearest;
    }

    function moveAndSlide(collider, displacement, moveOptions) {
      const move = moveOptions || {};
      const start = colliderWorldPosition(collider);
      const position = start.clone();
      const orientation = colliderOrientation(collider);
      const contacts = [];
      const requested = vectorFrom(displacement, [0, 0, 0]);
      const deltaSeconds = Number.isFinite(move.deltaSeconds) && move.deltaSeconds > 0 ? move.deltaSeconds : 0;
      let limited = false;
      const iterations = Number.isInteger(move.maxIterations) && move.maxIterations > 0 ? move.maxIterations : defaultIterations;
      const skin = Number.isFinite(move.skinWidth) && move.skinWidth >= 0 ? move.skinWidth : skinWidth;

      for (let iteration = 0; iteration < iterations; iteration += 1) {
        const overlaps = queryOverlap(collider, position, { includeTriggers: false });
        if (overlaps.length === 0) break;
        overlaps.sort((left, right) => left.depth - right.depth);
        const overlap = overlaps[0];
        position.addScaledVector(overlap.normal, overlap.depth + skin);
        contacts.push({ collider: overlap.collider, normal: overlap.normal.clone(), time: 0,
          penetration: overlap.depth, phase: "recovery", approachSpeed: 0 });
      }

      limited = queryOverlap(collider, position, { includeTriggers: false }).length > 0;
      // Resolve rotation at the current root before translation; neither pose is published mid-step.
      if (!limited && move.orientation?.isQuaternion) {
        const targetOrientation = move.orientation.clone().normalize();
        const hit = sweep(collider, position, position, { fromOrientation: orientation, orientation: targetOrientation });
        orientation.slerp(targetOrientation, hit ? hit.time : 1);
        if (hit?.limited) limited = true;
        else if (hit) contacts.push({ collider: hit.collider, normal: hit.normal.clone(), time: hit.time,
          penetration: 0, phase: "rotation", approachSpeed: null });
      }

      if (move.displacementSpace === "local") requested.applyQuaternion(orientation);
      const velocity = deltaSeconds ? requested.clone().divideScalar(deltaSeconds) : null;
      let remaining = requested.clone();
      for (let iteration = 0; iteration < iterations && remaining.lengthSq() > 1e-12; iteration += 1) {
        if (limited) break;
        const destination = position.clone().add(remaining);
        const hit = sweep(collider, position, destination, { includeTriggers: false, fromOrientation: orientation, orientation });
        if (!hit) {
          position.copy(destination);
          remaining.set(0, 0, 0);
          break;
        }
        const closingDistance = Math.max(0, -remaining.dot(hit.normal));
        const safeTime = Math.max(0, hit.time - (closingDistance > 1e-12 ? skin / closingDistance : 0));
        position.addScaledVector(remaining, safeTime);
        const leftover = remaining.multiplyScalar(1 - safeTime);
        if (hit.limited) { limited = true; break; }
        const intoSurface = leftover.dot(hit.normal);
        if (intoSurface < 0) leftover.addScaledVector(hit.normal, -intoSurface);
        remaining = leftover;
        const approachSpeed = velocity ? Math.max(0, -velocity.dot(hit.normal)) : null;
        contacts.push({ collider: hit.collider, normal: hit.normal.clone(), time: hit.time, penetration: 0,
          phase: "translation", approachSpeed });
        if (velocity && approachSpeed > 0) velocity.addScaledVector(hit.normal, approachSpeed);
      }

      const triggers = queryOverlap(collider, position, { includeTriggers: true, orientation })
        .filter((entry) => entry.collider.isTrigger);
      return {
        position,
        orientation,
        displacement: position.clone().sub(start),
        remaining,
        contacts,
        triggers,
        limited: limited || remaining.lengthSq() > 1e-12
      };
    }

    function commitPose(collider, position, orientation) {
      collider.position.copy(position);
      if (collider.authoritativePosition?.isVector3) collider.authoritativePosition.copy(position);
      if (collider.authoritativeOrientation) collider.authoritativeOrientation.copy(orientation);
      if (collider.orientation) collider.orientation.copy(orientation);
      if (collider.owner?.position?.isVector3 && collider.owner.position !== collider.position) {
        const localPosition = position.clone();
        const localOrientation = orientation.clone();
        if (collider.owner.parent) {
          collider.owner.parent.updateWorldMatrix(true, false);
          collider.owner.parent.worldToLocal(localPosition);
          localOrientation.premultiply(collider.owner.parent.getWorldQuaternion(new THREE.Quaternion()).invert());
        }
        collider.owner.position.copy(localPosition);
        collider.owner.quaternion.copy(localOrientation);
      }
    }

    function restoreAuthoritativePose(collider) {
      const position = collider.authoritativePosition?.isVector3
        ? collider.authoritativePosition
        : collider.position;
      commitPose(collider, position, colliderOrientation(collider));
      return position;
    }

    function moveSolid(collider, displacement, moveOptions) {
      if (!colliders.has(collider) || collider.isTrigger) {
        throw new Error("collisionWorld.moveSolid requires a registered solid collider");
      }
      const move = Object.assign({}, moveOptions);
      if (move.orientation?.isQuaternion) move.orientation = move.orientation.clone();
      const requested = vectorFrom(displacement, [0, 0, 0]);
      restoreAuthoritativePose(collider);
      const result = moveAndSlide(collider, requested, move);
      commitPose(collider, result.position, result.orientation);
      return result;
    }

    function placeSolid(collider, nextPosition, placeOptions) {
      if (!colliders.has(collider) || collider.isTrigger) {
        throw new Error("collisionWorld.placeSolid requires a registered solid collider");
      }
      const candidate = vectorFrom(nextPosition, collider.authoritativePosition || collider.position);
      const orientation = colliderOrientation(collider, placeOptions?.orientation);
      const current = restoreAuthoritativePose(collider);
      const overlaps = queryOverlap(collider, candidate, { includeTriggers: false, orientation });
      if (overlaps.length > 0) {
        return { placed: false, position: current.clone(), orientation: colliderOrientation(collider), overlaps };
      }
      commitPose(collider, candidate, orientation);
      return { placed: true, position: candidate.clone(), orientation, overlaps };
    }

    function castProbe(origin, direction, distance, radius, queryOptions, detectInitialOverlap) {
      const query = queryOptions || {};
      const start = vectorFrom(origin, [0, 0, 0]);
      const rayDirection = normalizedVector(direction, [0, 0, -1], "cast direction");
      const length = Number.isFinite(distance) && distance >= 0 ? distance : Infinity;
      const probe = { shape: "sphere", radius, offset: new THREE.Vector3(), position: start };
      const orientation = new THREE.Quaternion();
      let nearest = null;
      for (const collider of colliders) {
        if (!collider.enabled || (!query.includeTriggers && collider.isTrigger)) continue;
        if (query.ignoreCollider === collider || (query.ignoreOwner && query.ignoreOwner === collider.owner)) continue;
        if (query.layer && !maskContains(collider.mask, String(query.layer))) continue;
        const shape = colliderGeometry(collider);
        // A finite per-candidate bound also supports unbounded rays without a world-size constant.
        const castLength = Math.min(length, nearest ? nearest.distance : Infinity,
          start.distanceTo(shape.center) + shape.max.distanceTo(shape.center) + radius + 1);
        const delta = rayDirection.clone().multiplyScalar(castLength);
        if (!detectInitialOverlap && shapeSeparation(colliderGeometry(probe), shape).distance < 0) continue;
        const hit = castShape(probe, start, delta, { from: orientation, to: orientation }, shape, detectInitialOverlap);
        if (!hit) continue;
        const hitDistance = hit.time * castLength;
        if (hitDistance <= length && (!nearest || hitDistance < nearest.distance)) {
          nearest = {
            collider,
            distance: hitDistance,
            point: start.clone().addScaledVector(rayDirection, hitDistance),
            normal: hit.normal,
            limited: Boolean(hit.limited)
          };
        }
      }
      return nearest;
    }

    function raycast(origin, direction, distance, queryOptions) {
      return castProbe(origin, direction, distance, 0, queryOptions, false);
    }

    function sphereCast(origin, direction, distance, radius, queryOptions) {
      const probeRadius = Number.isFinite(radius) && radius >= 0 ? radius : 0;
      return castProbe(
        origin,
        direction,
        distance,
        probeRadius,
        queryOptions,
        true
      );
    }

    return Object.freeze({
      add,
      addSolid,
      addTrigger,
      remove,
      clear,
      queryOverlap,
      sweep,
      moveAndSlide,
      moveSolid,
      placeSolid,
      raycast,
      sphereCast,
      colliders
    });
  }

  global.LOBSTER_THREE_RUNTIME = Object.freeze({
    version: "1.9.0",
    clampPixelRatio,
    createFixedStepLoop,
    observeRendererSize,
    createInputLifecycle,
    createResourceTracker,
    installContextLifecycle,
    createSpatialFrame,
    getPlanarFrame,
    mapDirectionalInput,
    resolveLocomotionFacing,
    transformLocalDirection,
    faceDirection,
    alignGeometryAxis,
    screenPointToRay,
    relativePointerToRotation,
    createCameraRig,
    createBoxCollider,
    createSphereCollider,
    createCapsuleCollider,
    createTriggerCollider,
    createCollisionWorld
  });
})(typeof window === "object" ? window : globalThis);
