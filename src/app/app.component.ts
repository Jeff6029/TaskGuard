import { Component, ElementRef, OnDestroy, ViewChild } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { invoke } from "@tauri-apps/api/core";
import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-root",
  imports: [RouterOutlet, FormsModule],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
})
export class AppComponent implements OnDestroy {
  @ViewChild("cameraVideo") cameraVideo?: ElementRef<HTMLVideoElement>;

  lockStatus = "";
  locking = false;
  cameraStatus = "Monitor detenido";
  monitoring = false;
  autoLockEnabled = true;
  faceDetected = false;
  absenceThresholdSeconds = 5;
  absenceSeconds = 0;

  private detector?: FaceDetector;
  private mediaStream?: MediaStream;
  private detectionIntervalId?: number;
  private monitorIntervalId?: number;
  private lastFaceSeenAt = 0;
  private lastLockAttemptAt = 0;
  private readonly lockCooldownMs = 30_000;

  async startMonitoring(): Promise<void> {
    if (this.monitoring) {
      return;
    }

    try {
      this.cameraStatus = "Inicializando detector...";
      await this.ensureDetector();

      this.cameraStatus = "Solicitando permisos de cámara...";
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      const video = this.cameraVideo?.nativeElement;
      if (!video) {
        throw new Error("No se encontró el elemento de video.");
      }

      video.srcObject = this.mediaStream;
      video.muted = true;
      video.playsInline = true;
      await video.play();

      this.monitoring = true;
      this.faceDetected = false;
      this.lastFaceSeenAt = Date.now();
      this.absenceSeconds = 0;
      this.cameraStatus = "Monitor activo";

      this.detectionIntervalId = window.setInterval(() => {
        void this.detectPresence();
      }, 500);

      this.monitorIntervalId = window.setInterval(() => {
        void this.evaluateAbsenceAndLock();
      }, 1000);
    } catch (error) {
      this.cameraStatus = "No se pudo iniciar la cámara";
      const message = error instanceof Error ? error.message : String(error);
      this.lockStatus = `Error al iniciar monitor: ${message}`;
      this.stopMonitoring();
    }
  }

  stopMonitoring(): void {
    if (this.detectionIntervalId !== undefined) {
      window.clearInterval(this.detectionIntervalId);
      this.detectionIntervalId = undefined;
    }

    if (this.monitorIntervalId !== undefined) {
      window.clearInterval(this.monitorIntervalId);
      this.monitorIntervalId = undefined;
    }

    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) {
        track.stop();
      }
      this.mediaStream = undefined;
    }

    const video = this.cameraVideo?.nativeElement;
    if (video) {
      video.pause();
      video.srcObject = null;
    }

    this.monitoring = false;
    this.faceDetected = false;
    this.absenceSeconds = 0;
    this.cameraStatus = "Monitor detenido";
  }

  async lockNow(reason = "Bloqueo manual"): Promise<void> {
    if (this.locking) {
      return;
    }

    this.locking = true;
    this.lockStatus = `${reason}: intentando bloquear la sesión...`;

    try {
      await invoke("lock_session");
      this.lastLockAttemptAt = Date.now();
      this.lockStatus = "Comando enviado. Si tu SO lo permite, la sesión se bloqueará ahora.";
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.lockStatus = `No se pudo bloquear la sesión: ${message}`;
    } finally {
      this.locking = false;
    }
  }

  ngOnDestroy(): void {
    this.stopMonitoring();
    this.detector?.close();
    this.detector = undefined;
  }

  private async ensureDetector(): Promise<void> {
    if (this.detector) {
      return;
    }

    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
    );

    this.detector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
      },
      runningMode: "VIDEO",
      minDetectionConfidence: 0.6,
    });
  }

  private async detectPresence(): Promise<void> {
    if (!this.monitoring || !this.detector) {
      return;
    }

    const video = this.cameraVideo?.nativeElement;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return;
    }

    const result = this.detector.detectForVideo(video, performance.now());
    const detected = (result.detections?.length ?? 0) > 0;

    this.faceDetected = detected;
    if (detected) {
      this.lastFaceSeenAt = Date.now();
      this.cameraStatus = "Persona detectada";
      return;
    }

    this.cameraStatus = "Sin detección";
  }

  private async evaluateAbsenceAndLock(): Promise<void> {
    if (!this.monitoring || !this.autoLockEnabled || this.locking) {
      return;
    }

    const now = Date.now();
    const absenceMs = now - this.lastFaceSeenAt;
    this.absenceSeconds = Math.floor(absenceMs / 1000);

    if (absenceMs < this.absenceThresholdSeconds * 1000) {
      return;
    }

    if (now - this.lastLockAttemptAt < this.lockCooldownMs) {
      return;
    }

    await this.lockNow("Ausencia detectada");
  }
}
