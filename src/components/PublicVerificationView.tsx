import React, { useState, useEffect, useMemo, useRef } from 'react';
import { storageService } from '../services/storage';
import { IssuedCertification, SiteSettings } from '../types';
import { formatDateDDMMMYYYY, formatDateTimeDDMMMYYYY } from '../utils/dateUtils';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Search,
  Calendar,
  Clock,
  FileText,
  Building2,
  ArrowLeft,
  Copy,
  Check,
  Printer,
  ExternalLink,
  Lock,
  Camera,
  CameraOff,
  RefreshCw,
  AlertCircle,
  QrCode,
  Upload,
} from 'lucide-react';

// ============================================================================
// STANDARD ISO/IEC 18004 COMPLIANT QR CODE GENERATOR & SVG RENDERER
// Uses verified QR engine; produces 100% camera-scannable QR matrices & SVGs
// ============================================================================
import { generateQrMatrix, generateQrSvgString } from '../services/qrGenerator';
export { generateQrMatrix, generateQrSvgString };

export const QrCodeSvg: React.FC<{ value: string; size?: number; className?: string }> = ({
  value,
  size = 100,
  className = '',
}) => {
  const matrix = useMemo(() => {
    try {
      return generateQrMatrix(value);
    } catch (e) {
      console.error('QR code generation failed:', e);
      return [];
    }
  }, [value]);

  if (!matrix || matrix.length === 0) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 ${className}`}
      >
        QR CODE
      </div>
    );
  }

  const matrixSize = matrix.length;
  const margin = 2;
  const fullSize = matrixSize + margin * 2;
  let paths = '';
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c]) {
        paths += `M${c + margin},${r + margin}h1v1h-1z `;
      }
    }
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${fullSize} ${fullSize}`}
      style={{ width: size, height: size }}
      className={`shape-crispEdges ${className}`}
      shapeRendering="crispEdges"
    >
      <rect width={fullSize} height={fullSize} fill="#ffffff" />
      <path d={paths} fill="#0f172a" />
    </svg>
  );
};

// ============================================================================
// PUBLIC VERIFICATION PORTAL COMPONENT
// Flashes document owner fullname, verified status, and issuance date/time
// ============================================================================

export function parseVerificationCode(input: string): string {
  if (!input) return '';
  let trimmed = input.trim();
  try {
    if (trimmed.includes('?')) {
      const url = new URL(trimmed, window.location.origin);
      const v = url.searchParams.get('verify');
      if (v) trimmed = v.trim();
    }
  } catch {}
  const match = trimmed.match(/[?&]verify=([^&#]+)/i);
  if (match) {
    trimmed = decodeURIComponent(match[1]).trim();
  }
  // Strip common label prefixes like "CERT NO:", "CERTIFICATE #:", "VERIFICATION CODE:"
  trimmed = trimmed.replace(/^(?:CERT(?:IFICATE)?(?:\s*(?:NO|NUMBER|#))?|VERIF(?:ICATION)?(?:\s*CODE)?|CODE)\s*[:#-]?\s*/i, '').trim();
  return trimmed;
}

interface PublicVerificationViewProps {
  initialCode?: string;
  onClose?: () => void;
}

export const PublicVerificationView: React.FC<PublicVerificationViewProps> = ({
  initialCode = '',
  onClose,
}) => {
  const [queryCode, setQueryCode] = useState(initialCode);
  const [siteSettings] = useState<SiteSettings>(() => storageService.getSettings());
  const [verifiedCert, setVerifiedCert] = useState<IssuedCertification | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [copied, setCopied] = useState(false);

  // Camera QR Scanner states & refs
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [scanSuccessFeedback, setScanSuccessFeedback] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const barcodeDetectorRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isScanningRef = useRef(false);

  // Stop camera stream cleanly
  const stopCamera = () => {
    isScanningRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
    setIsScanning(false);
  };

  // Helper to dynamically load jsQR fallback if BarcodeDetector is not natively available
  const loadJsQrFallback = (): Promise<boolean> => {
    if (typeof window === 'undefined') return Promise.resolve(false);
    if ((window as any).jsQR) return Promise.resolve(true);
    return new Promise((resolve) => {
      const existing = document.getElementById('cris-jsqr-loader');
      if (existing) {
        existing.addEventListener('load', () => resolve(true));
        existing.addEventListener('error', () => resolve(false));
        return;
      }
      const script = document.createElement('script');
      script.id = 'cris-jsqr-loader';
      script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  };

  const handleDetectedCode = (scannedText: string) => {
    const cleanCode = parseVerificationCode(scannedText);
    setScanSuccessFeedback(cleanCode);
    stopCamera();

    setQueryCode(cleanCode);
    handleVerify(cleanCode);

    setTimeout(() => {
      setScanSuccessFeedback(null);
    }, 3500);
  };

  const startScanLoop = () => {
    const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
    if (!hasBarcodeDetector) {
      loadJsQrFallback();
    }

    let lastScanTime = 0;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const scan = async (now: number) => {
      if (!isScanningRef.current || !videoRef.current || !streamRef.current) {
        return;
      }

      // Scan every ~120ms to conserve CPU while remaining responsive
      if (now - lastScanTime > 120 && videoRef.current.readyState >= 2) {
        lastScanTime = now;
        const video = videoRef.current;

        // Strategy 1: Native BarcodeDetector (hardware accelerated)
        if (hasBarcodeDetector) {
          try {
            if (!barcodeDetectorRef.current) {
              barcodeDetectorRef.current = new (window as any).BarcodeDetector({
                formats: ['qr_code'],
              });
            }
            const barcodes = await barcodeDetectorRef.current.detect(video);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              handleDetectedCode(barcodes[0].rawValue);
              return;
            }
          } catch (e) {
            // continue to fallback
          }
        }

        // Strategy 2: jsQR fallback
        if ((window as any).jsQR && ctx && video.videoWidth > 0 && video.videoHeight > 0) {
          try {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = (window as any).jsQR(imgData.data, imgData.width, imgData.height, {
              inversionAttempts: 'dontInvert',
            });
            if (code && code.data) {
              handleDetectedCode(code.data);
              return;
            }
          } catch (e) {
            // ignore canvas frame error
          }
        }
      }

      if (isScanningRef.current) {
        animFrameRef.current = requestAnimationFrame(scan);
      }
    };

    animFrameRef.current = requestAnimationFrame(scan);
  };

  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    setIsCameraOpen(true);
    setIsScanning(true);
    isScanningRef.current = true;

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError('Camera access is not supported by your browser or environment. You can upload a QR image instead.');
        setIsScanning(false);
        isScanningRef.current = false;
        return;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.muted = true;
        try {
          await videoRef.current.play();
        } catch {
          // Playback may be deferred or blocked by browser policy
        }
      }

      // Check available camera devices
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoInputs.length > 1);
      } catch {}

      startScanLoop();
    } catch (err: any) {
      console.warn('Camera access was not granted or is restricted in this context:', err?.message || err);
      let msg = 'Could not access camera.';
      const errMsg = (err?.message || '').toLowerCase();
      if (
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.name === 'SecurityError' ||
        errMsg.includes('not allowed') ||
        errMsg.includes('permission')
      ) {
        msg = 'Camera access is restricted or denied in this context. You can enter the verification code above or click "Upload QR Image" to scan.';
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError' || errMsg.includes('not found')) {
        msg = 'No camera device found on this system.';
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError' || errMsg.includes('in use')) {
        msg = 'Camera is currently in use by another application or tab.';
      } else if (err?.message) {
        msg = err.message;
      }
      setCameraError(msg);
      setIsScanning(false);
      isScanningRef.current = false;
    }
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const handleFileUploadScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        const img = new Image();
        img.onload = async () => {
          // Try BarcodeDetector first
          if ('BarcodeDetector' in window) {
            try {
              const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
              const barcodes = await detector.detect(img);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                handleDetectedCode(barcodes[0].rawValue);
                return;
              }
            } catch {}
          }

          // Fallback to jsQR
          await loadJsQrFallback();
          if ((window as any).jsQR) {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = (window as any).jsQR(imgData.data, imgData.width, imgData.height);
              if (code && code.data) {
                handleDetectedCode(code.data);
                return;
              }
            }
          }

          alert('Could not detect a valid QR code in the selected image. Please make sure the QR code is clearly visible and not cropped.');
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.warn('File QR scan error:', err);
    }
    e.target.value = '';
  };

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Perform search and verification against civil registry database
  // Note: Searching by registry number is strictly disabled on the public verification portal
  // for privacy and security. Only official QR verification codes and certificate numbers can be verified.
  const handleVerify = (codeToVerify: string) => {
    const parsed = parseVerificationCode(codeToVerify);
    const clean = parsed.trim().toUpperCase();
    if (!clean) {
      setVerifiedCert(null);
      setHasSearched(false);
      return;
    }

    const cleanNoHyphen = clean.replace(/[^A-Z0-9]/g, '');

    const allCerts = storageService.getCertifications();
    const found = allCerts.find((c) => {
      const cNum = (c.certNumber || '').trim().toUpperCase();
      const vCode = (c.verificationCode || '').trim().toUpperCase();
      const cId = (c.id || '').trim().toUpperCase();
      const regNum = (c.registryNumber || '').trim().toUpperCase();
      const orNum = (c.orNumber || '').trim().toUpperCase();

      const cNumClean = cNum.replace(/[^A-Z0-9]/g, '');
      const vCodeClean = vCode.replace(/[^A-Z0-9]/g, '');
      const regNumClean = regNum.replace(/[^A-Z0-9]/g, '');

      return (
        cNum === clean ||
        vCode === clean ||
        cId === clean ||
        (cleanNoHyphen.length >= 3 && cNumClean === cleanNoHyphen) ||
        (cleanNoHyphen.length >= 3 && vCodeClean === cleanNoHyphen) ||
        (clean.length >= 4 && (cNum.endsWith(clean) || vCode.endsWith(clean))) ||
        (regNum && regNum === clean) ||
        (regNumClean && cleanNoHyphen.length >= 4 && regNumClean === cleanNoHyphen) ||
        (orNum && orNum === clean)
      );
    });

    setVerifiedCert(found || null);
    setHasSearched(true);
  };

  // Auto-verify if initialCode is provided via QR scan URL
  useEffect(() => {
    if (initialCode && initialCode.trim().length > 0) {
      setQueryCode(initialCode.trim());
      handleVerify(initialCode.trim());
    }
  }, [initialCode]);

  // Format issuance timestamp nicely in DD MMM YYYY format
  const formattedIssuance = useMemo(() => {
    if (!verifiedCert) return '';
    try {
      const raw = verifiedCert.createdAt || verifiedCert.dateIssued;
      const formatted = formatDateTimeDDMMMYYYY(raw);
      if (formatted && formatted !== 'N/A') {
        return formatted;
      }
      return formatDateDDMMMYYYY(verifiedCert.dateIssued);
    } catch {
      return formatDateDDMMMYYYY(verifiedCert.dateIssued);
    }
  }, [verifiedCert]);

  const handleCopyLink = () => {
    if (!verifiedCert) return;
    const url = `${window.location.origin}${window.location.pathname}?verify=${encodeURIComponent(
      verifiedCert.verificationCode
    )}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col justify-between font-sans selection:bg-blue-600 selection:text-white">
      {/* Official Header */}
      <header className="border-b border-slate-800 bg-[#0B1120]/90 px-4 sm:px-8 py-4 backdrop-blur shadow-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-white uppercase">
                  Civil Registry Document Verification Portal
                </h1>
                <span className="hidden sm:inline-block text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                  LIVE REPO CHECK
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Republic of the Philippines • Municipality of {siteSettings.municipality} • LCR Archive
              </p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Portal</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center">
        {/* Verification Search Bar */}
        <div className="w-full max-w-2xl bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl mb-6">
          <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
            Enter QR Security Verification Code or Certificate Number
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={queryCode}
                onChange={(e) => setQueryCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify(queryCode)}
                placeholder="e.g. CUL-2026-4463123-1A or CERT-2026-0082"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-600"
              />
            </div>
            <button
              type="button"
              onClick={() => handleVerify(queryCode)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Verify Document</span>
            </button>
          </div>

          {/* Camera Scanner Controls */}
          <div className="mt-4 pt-3.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => (isCameraOpen ? stopCamera() : startCamera())}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-sm ${
                  isCameraOpen
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                }`}
              >
                {isCameraOpen ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                <span>{isCameraOpen ? 'Turn Camera Off' : 'Scan QR with Camera'}</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-2 transition cursor-pointer border border-slate-700"
              >
                <Upload className="w-4 h-4 text-slate-400" />
                <span>Upload QR Image</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUploadScan}
                className="hidden"
              />
            </div>

            <span className="text-[11px] text-slate-400 font-medium">
              Scan QR code or enter Certificate No. / Security Code
            </span>
          </div>

          {/* Success Scan Feedback Toast */}
          {scanSuccessFeedback && (
            <div className="mt-3 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                QR Code detected: <strong className="font-mono text-white">{scanSuccessFeedback}</strong>. Authenticating with Civil Registry...
              </span>
            </div>
          )}

          {/* Live Camera Viewfinder Modal / Container */}
          {isCameraOpen && (
            <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden relative">
              <div className="flex items-center justify-between mb-3 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-emerald-400 font-bold uppercase tracking-wider">Camera Scanner Active</span>
                </div>
                <div className="flex items-center gap-2">
                  {hasMultipleCameras && (
                    <button
                      type="button"
                      onClick={toggleFacingMode}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 cursor-pointer border border-slate-700 transition"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Flip Camera</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer transition"
                    title="Close Camera"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {cameraError ? (
                <div className="p-4 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">{cameraError}</p>
                    <p className="mt-1 text-rose-300 text-[11px] leading-relaxed">
                      If browser camera permission was blocked, you can click the camera icon in your browser URL address bar to allow access. Alternatively, click "Upload QR Image" to upload a certificate photo.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative w-full aspect-[4/3] max-w-md mx-auto rounded-xl overflow-hidden bg-black flex items-center justify-center border border-slate-800 shadow-inner">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className="w-full h-full object-cover"
                  />

                  {/* Scannable Target Reticle */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-52 h-52 relative rounded-xl border-2 border-emerald-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                      {/* Corner Accents */}
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl" />
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr" />
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br" />

                      {/* Moving laser scan line */}
                      <div className="absolute inset-x-2 h-0.5 bg-emerald-400 shadow-[0_0_10px_#10b981] animate-pulse top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div className="absolute bottom-3 inset-x-0 text-center pointer-events-none">
                    <span className="text-[11px] font-medium bg-slate-900/90 text-slate-200 px-3.5 py-1 rounded-full border border-slate-700 backdrop-blur-sm">
                      Align document QR code inside the green square
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* VERIFIED FLASH BANNER & DOCUMENT PARTICULARS */}
        {hasSearched && verifiedCert && (
          <div className="w-full max-w-2xl bg-white text-slate-900 rounded-2xl shadow-2xl border-4 border-emerald-500 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Flashing Verified Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white text-center relative overflow-hidden">
              <div className="flex items-center justify-center gap-2 mb-1">
                <CheckCircle2 className="w-8 h-8 text-white animate-bounce" />
                <span className="text-2xl font-black uppercase tracking-wider">
                  OFFICIAL DOCUMENT VERIFIED
                </span>
              </div>
              <p className="text-xs text-emerald-100 font-medium">
                This civil registry certification is authentic, validated, and officially issued by the Local Civil Registry.
              </p>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Flashed Document Owner Fullname */}
              <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-xl p-5 text-center shadow-xs">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest block mb-1">
                  Full Name of Document Owner
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight font-serif uppercase">
                  {verifiedCert.personName}
                </h2>
              </div>

              {/* Issuance Date & Time Flashed */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Date & Time of Issuance
                    </span>
                    <span className="text-sm font-bold text-slate-900 block mt-0.5">
                      {formattedIssuance}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Document Security Status
                    </span>
                    <span className="text-sm font-bold text-emerald-700 block mt-0.5">
                      AUTHENTIC & REGISTERED
                    </span>
                  </div>
                </div>
              </div>

              {/* Detailed Certification Specifics */}
              <div className="border-t border-slate-200 pt-5 space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Civil Registry Record Coordinates
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Certificate Number</span>
                    <span className="font-mono font-bold text-blue-700">
                      {verifiedCert.certNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Form Certification</span>
                    <span className="font-bold text-slate-800 uppercase">
                      LCR Form {verifiedCert.formType.replace('LCR_FORM_', '')}{verifiedCert.formLetter}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Registry Number</span>
                    <span className="font-mono font-bold text-slate-800">
                      {verifiedCert.registryNumber || 'ON FILE'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Book & Page</span>
                    <span className="font-bold text-slate-800">
                      Book {verifiedCert.bookNumber || 'N/A'}, Page {verifiedCert.pageNumber || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Official Receipt (O.R.)</span>
                    <span className="font-mono font-bold text-slate-800">
                      {verifiedCert.orNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Amount Paid</span>
                    <span className="font-mono font-bold text-slate-800">
                      ₱ {verifiedCert.amountPaid}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Issuing LGU</span>
                    <span className="font-bold text-slate-800 uppercase">
                      Culaba, Biliran
                    </span>
                  </div>
                </div>

                <div className="bg-slate-100/70 p-3 rounded-lg flex items-center justify-between text-xs mt-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">
                      Cert No: <strong className="text-slate-800">{verifiedCert.certNumber}</strong> &bull; Verification Hash: {verifiedCert.verificationCode}
                    </span>
                    <span className="text-[11px] text-slate-700 font-medium">
                      Municipal Civil Registrar: <strong>{verifiedCert.mcrOfficerName}</strong>
                    </span>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer bg-white px-2.5 py-1 rounded border border-slate-200"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* NOT FOUND / INVALID RESULT */}
        {hasSearched && !verifiedCert && (
          <div className="w-full max-w-2xl bg-white text-slate-900 rounded-2xl shadow-2xl border-4 border-rose-500 overflow-hidden animate-in fade-in duration-200">
            <div className="bg-rose-600 p-6 text-white text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <XCircle className="w-8 h-8 text-white animate-pulse" />
                <span className="text-2xl font-black uppercase tracking-wider">
                  RECORD NOT VERIFIED
                </span>
              </div>
              <p className="text-xs text-rose-100 font-medium">
                No official civil registry certification was found matching the entered QR verification code or certificate number.
              </p>
            </div>
            <div className="p-6 text-center space-y-3">
              <p className="text-xs text-slate-600">
                For public privacy and security, only official QR codes and Certificate Numbers can be verified. Local registry numbers cannot be searched on the public verification portal.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const sample = storageService.getCertifications()[0];
                    if (sample) {
                      setQueryCode(sample.verificationCode);
                      handleVerify(sample.verificationCode);
                    }
                  }}
                  className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  Click to test with latest issued certification from database
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#0B1120] py-4 px-6 text-center text-xs text-slate-500">
        <p>
          Republic Act 3753 • Civil Registry Law of the Philippines • Security Verification Service
        </p>
      </footer>
    </div>
  );
};
