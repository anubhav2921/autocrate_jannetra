import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Camera, MapPin, Mic, Send, RefreshCw, X, Check, 
    AlertTriangle, Loader2, Sparkles, User, Clock, CheckCircle2,
    RotateCcw, SwitchCamera, Info, Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

const ReportIssue = () => {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const fileInputRef = useRef(null);
    
    // States
    const [step, setStep] = useState('intro'); // intro, camera, analyzing, autofill
    const [capturedImage, setCapturedImage] = useState(null);
    const [location, setLocation] = useState(null);
    const [facingMode, setFacingMode] = useState('environment'); // 'user' or 'environment'
    const [isCameraReady, setIsCameraReady] = useState(false);
    
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiResult, setAiResult] = useState(null);
    const [reportId, setReportId] = useState(null);
    
    const [description, setDescription] = useState('');
    const [issueType, setIssueType] = useState('');
    const [department, setDepartment] = useState('');
    
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const [audioBlob, setAudioBlob] = useState(null);
    const [isRecordingAudio, setIsRecordingAudio] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Camera Access
    const startCamera = async () => {
        try {
            // Stop any existing stream first
            stopCamera();
            
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false 
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
            }
        } catch (err) {
            console.error("Camera access denied:", err);
            // alert("Please allow camera access to report an issue.");
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const toggleCamera = () => {
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    };

    useEffect(() => {
        if (step === 'camera') {
            setIsCameraReady(false);
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [step, facingMode]);

    // Geolocation
    const fetchLocation = useCallback(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    console.log("Location fetched:", lat, lng);
                    setLocation({ latitude: lat, longitude: lng });
                },
                (err) => {
                    console.warn("Geolocation fallback:", err.message);
                    // Use a mock/default location for dev if permission denied but user wants to test
                    // setLocation({ latitude: 25.4358, longitude: 81.8463 }); // Prayagraj
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        }
    }, []);

    useEffect(() => {
        if (step === 'camera' || step === 'intro' || step === 'autofill') {
            fetchLocation();
            const interval = setInterval(fetchLocation, 10000); // Update every 10s
            return () => clearInterval(interval);
        }
    }, [step, fetchLocation]);

    // Capture Image
    const capturePhoto = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        console.log("Capture clicked:", { 
            hasVideo: !!video, 
            hasCanvas: !!canvas, 
            readyState: video?.readyState,
            width: video?.videoWidth,
            height: video?.videoHeight
        });

        if (!video || !canvas || video.readyState !== 4 || video.videoWidth === 0) {
            console.warn("Capture aborted: Video not ready or dimensions zero");
            return;
        }

        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // 1. Draw the frame
        if (facingMode === 'user') {
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Reset transform for drawing text
        context.setTransform(1, 0, 0, 1, 0, 0);

        // 2. Draw Location Watermark (Bottom Right)
        if (location) {
            const lat = location.latitude.toFixed(6);
            const lng = location.longitude.toFixed(6);
            const text = `Lat: ${lat} | Lng: ${lng}`;
            const ts = new Date().toLocaleString();
            
            context.font = "bold 24px Inter, sans-serif";
            context.fillStyle = "rgba(0, 0, 0, 0.5)";
            const padding = 20;
            const textWidth = Math.max(context.measureText(text).width, context.measureText(ts).width);
            
            // Draw background for readability
            context.fillRect(
                canvas.width - textWidth - padding * 2, 
                canvas.height - 80 - padding, 
                textWidth + padding * 2, 
                80
            );

            context.fillStyle = "white";
            context.textAlign = "right";
            context.fillText(text, canvas.width - padding, canvas.height - 50);
            context.font = "18px Inter, sans-serif";
            context.fillText(ts, canvas.width - padding, canvas.height - 25);
        }
        
        const imageData = canvas.toDataURL('image/jpeg', 0.82);
        setCapturedImage(imageData);
        setStep('analyzing');
        handleAnalyze(imageData);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const imageData = event.target.result;
            setCapturedImage(imageData);
            setStep('analyzing');
            handleAnalyze(imageData);
        };
        reader.readAsDataURL(file);
    };

    // AI Analysis
    const handleAnalyze = async (imageData) => {
        setIsAnalyzing(true);
        try {
            const formData = new FormData();
            const fetchRes = await fetch(imageData);
            const blob = await fetchRes.blob();
            formData.append('image', blob, 'issue.jpg');
            formData.append('latitude', location?.latitude || 0);
            formData.append('longitude', location?.longitude || 0);
            formData.append('timestamp', new Date().toISOString());

            console.log("Starting AI analysis via centralized apiClient...");
            
            const res = await api.post('/report-issue', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            console.log("AI Analysis Success:", res);
            setAiResult(res);
            setIssueType(res.detected_issue);
            setDescription(res.ai_description);
            setStep('autofill');
        } catch (err) {
            console.error("AI Analysis failed:", err);
            // Instead of mock data, give user a way to manual input but keep it clean
            setAiResult({
                detected_issue: 'Manual Entry',
                ai_description: 'Analysis was unavailable. Please describe the situation manually.',
                severity: 'None',
                urgency: 'None',
                confidence: 0,
                scene_type: 'Other'
            });
            setIssueType('General Civic Issue');
            setDescription(''); // Let user decide
            setStep('autofill');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Real Audio Recording Implementation
    const toggleAudioRecording = async () => {
        if (isRecordingAudio) {
            mediaRecorderRef.current?.stop();
            setIsRecordingAudio(false);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            let options = { mimeType: 'audio/webm' };
            if (typeof MediaRecorder.isTypeSupported === 'function' && !MediaRecorder.isTypeSupported('audio/webm')) {
                options = MediaRecorder.isTypeSupported('audio/mp4') ? { mimeType: 'audio/mp4' } : {};
            }
            
            const mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const mimeType = options.mimeType || 'audio/mp4';
                const blob = new Blob(audioChunksRef.current, { type: mimeType });
                setAudioBlob(blob);
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                stream.getTracks().forEach(t => t.stop());
            };

            mediaRecorder.start();
            setIsRecordingAudio(true);
        } catch (err) {
            console.error("Audio recording failed", err);
            alert("Could not access microphone to record audio: " + err.message);
        }
    };

    const handleBack = () => {
        if (step === 'intro') navigate('/');
        else if (step === 'camera') setStep('intro');
        else if (step === 'autofill') setStep('camera');
        else if (step === 'analyzing') setStep('camera');
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        const newId = `JN-${Math.floor(100000 + Math.random() * 900000)}`;
        setReportId(newId);
        try {
            let uploadedAudioUrl = "";
            if (audioBlob) {
                const audioData = new FormData();
                audioData.append('audio', audioBlob, 'report_audio.webm');
                const audRes = await api.post('/upload-audio', audioData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                }).catch(() => ({ success: false }));
                
                if (audRes.success && audRes.audio_url && !audRes.audio_url.includes('mock-storage')) {
                    uploadedAudioUrl = audRes.audio_url;
                } else {
                    // Critical Fallback: Save audio as robust Base64 directly bypassing failed cloud storage
                    uploadedAudioUrl = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(audioBlob);
                    });
                }
            }

            await api.post('/report-issue/submit', {
                report_id: newId,
                image_url: aiResult.image_url || capturedImage,
                detected_issue: issueType,
                user_description: description,
                latitude: location?.latitude || 0,
                longitude: location?.longitude || 0,
                timestamp: new Date().toISOString(),
                metadata: {
                    ...aiResult,
                    department_tag: department,
                    audio_url: uploadedAudioUrl
                }
            });
            setStep('success');
        } catch (err) {
            console.error("Submission error:", err);
            let errMsg = err.message;
            if (err.response?.data) {
                errMsg = JSON.stringify(err.response.data);
            }
            alert("Failed to submit report. Please check your network and try again.\nError: " + errMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="report-full-page">
            {/* Minimal Header */}
            <div className="guided-header">
                <button className="icon-btn" onClick={handleBack}><X size={24} /></button>
                <div className="step-indicator">
                    <div className={`step-dot ${step === 'intro' ? 'active' : 'done'}`} />
                    <div className={`step-dot ${step === 'camera' ? 'active' : step === 'analyzing' || step === 'autofill' ? 'done' : ''}`} />
                    <div className={`step-dot ${step === 'autofill' ? 'active' : ''}`} />
                </div>
                <div style={{ width: 40 }} />
            </div>

            <main className="guided-container">
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <AnimatePresence mode="wait">
                    {step === 'intro' && (
                        <motion.div 
                            key="intro"
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                            className="intro-view"
                        >
                            <div className="intro-content">
                                <h1 className="main-title">How it Works</h1>
                                <p className="subtitle">Report civic issues in 3 simple steps</p>
                                
                                <div className="how-it-works-grid">
                                    <div className="work-card">
                                        <div className="card-icon"><Camera size={32} /></div>
                                        <h4>1. Click Picture</h4>
                                        <p>Capture a clear photo of the civic issue from your camera.</p>
                                    </div>
                                    <div className="work-card">
                                        <div className="card-icon"><MapPin size={32} /></div>
                                        <h4>2. Auto Location</h4>
                                        <p>GPS automatically detects the precise coordinates of the incident.</p>
                                    </div>
                                    <div className="work-card">
                                        <div className="card-icon"><Sparkles size={32} /></div>
                                        <h4>3. AI Description</h4>
                                        <p>Our vision model automatically identifies and describes the problem.</p>
                                    </div>
                                    <div className="work-card">
                                        <div className="card-icon"><Send size={32} /></div>
                                        <h4>4. Submit & Track</h4>
                                        <p>Get a unique Report ID to track the real-time resolution status.</p>
                                    </div>
                                </div>
                                
                                <button 
                                    className="btn btn-primary btn-lg mt-xl w-full start-btn"
                                    onClick={() => setStep('camera')}
                                >
                                    Proceed to Report Issue <Send size={20} className="ml-s" />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 'camera' && (
                        <motion.div 
                            key="camera"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="camera-fullscreen"
                        >
                            {!isCameraReady && (
                                <div className="camera-loading-overlay">
                                    <Loader2 className="animate-spin" size={40} />
                                    <p className="mt-m text-muted">Initializing camera...</p>
                                </div>
                            )}

                            <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                onCanPlay={() => {
                                    console.log("Video CanPlay event fired. Dimensions:", videoRef.current.videoWidth, "x", videoRef.current.videoHeight);
                                    setIsCameraReady(true);
                                }}
                                onLoadedMetadata={(e) => {
                                    console.log("Video metadata loaded.");
                                    e.target.play();
                                }}
                                className={`video-el ${facingMode === 'user' ? 'mirrored' : ''}`} 
                            />
                            
                            {/* Visual Guide Overlay */}
                            <div className="camera-overlay">
                                <div className="guide-box">
                                    <div className="corner tl" />
                                    <div className="corner tr" />
                                    <div className="corner bl" />
                                    <div className="corner br" />
                                </div>
                                <div className="overlay-hint">Place the issue inside the frame</div>
                                {location && (
                                    <div className="live-location-badge">
                                        <MapPin size={12} /> {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                                    </div>
                                )}
                            </div>

                            {/* Camera Actions */}
                            <div className="camera-actions-bar">
                                <button className="action-sub-btn" onClick={() => fileInputRef.current?.click()}>
                                    <ImageIcon size={20} />
                                </button>

                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    style={{ display: 'none' }} 
                                    accept="image/*" 
                                    onChange={handleFileUpload}
                                />
                                
                                <button 
                                    className={`main-capture-btn ${!isCameraReady ? 'disabled' : ''}`} 
                                    id="capture-btn"
                                    onClick={capturePhoto}
                                    disabled={!isCameraReady}
                                >
                                    <div className="inner-circle" />
                                </button>

                                <button className="action-sub-btn" onClick={toggleCamera}>
                                    <SwitchCamera size={20} />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 'analyzing' && (
                        <motion.div 
                            key="analyzing"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="analysis-fullscreen"
                        >
                            <img src={capturedImage} alt="Capture" className="blur-bg" />
                            <div className="analysis-content">
                                <div className="ai-scanning-ring">
                                    <Sparkles size={60} className="sparkle-active" />
                                    <div className="scan-line" />
                                </div>
                                <h2 className="mt-l">Analyzing with AI...</h2>
                                <p className="text-muted">Detecting issue type and severity</p>
                            </div>
                        </motion.div>
                    )}

                    {step === 'autofill' && (() => {
                        const confidenceScore = Number(aiResult?.confidence_score ?? aiResult?.confidence ?? 0);
                        const detectedIssueStr = String(aiResult?.detected_issue || issueType || '').trim().toLowerCase();
                        const severityStr = String(aiResult?.severity || '').trim().toLowerCase();

                        const isNoProblem = 
                            !aiResult || 
                            detectedIssueStr === 'none' || 
                            detectedIssueStr === 'no issue' || 
                            detectedIssueStr === 'no problem' ||
                            detectedIssueStr === 'no problem detected' ||
                            detectedIssueStr === 'normal' ||
                            severityStr === 'none';

                        const isLowConfidence = confidenceScore < 50;
                        const isInvalidReport = isNoProblem || isLowConfidence;

                        return (
                            <motion.div 
                                key="autofill"
                                initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
                                className="details-view"
                            >
                                <div className="details-card glass-premium">
                                    <div className="results-header">
                                        <div className="result-img-box">
                                            <img src={capturedImage} alt="Problem" />
                                        </div>
                                        <div className="result-meta">
                                            <span className="badge-ai">
                                                <Sparkles size={12} /> {aiResult?.scene_type || 'AI Detected'}
                                            </span>
                                            <h3>{issueType}</h3>
                                            <div className="confidence-label" style={{ color: isLowConfidence ? '#ef4444' : '#10b981' }}>
                                                {confidenceScore}% confidence {isLowConfidence ? '(Low Confidence)' : ''}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="location-row">
                                        <MapPin size={14} />
                                        <span>
                                            {location 
                                                ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
                                                : "Detecting GPS..."}
                                        </span>
                                        <span className="timestamp">{new Date().toLocaleTimeString()}</span>
                                    </div>

                                    <div className="form-section">
                                        <label>Add Audio Evidence (Voice Recording)</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                            <button 
                                                className={`mic-floating-btn ${isRecordingAudio ? 'active' : ''}`}
                                                onClick={toggleAudioRecording}
                                                style={{ position: 'relative', width: '56px', height: '56px', right: 0, bottom: 0 }}
                                            >
                                                <Mic size={24} />
                                            </button>
                                            <div style={{ flex: 1 }}>
                                                {isRecordingAudio ? (
                                                    <div className="text-blue animate-pulse font-medium">Recording Audio... Tap to stop</div>
                                                ) : audioUrl ? (
                                                    <audio src={audioUrl} controls style={{ width: '100%', height: '40px' }} />
                                                ) : (
                                                    <div className="text-muted text-sm">Tap mic to record authentic audio evidence</div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <label>Report Description</label>
                                        <div className="ai-textarea-container">
                                            <textarea 
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder="Add more details..."
                                                rows={7}
                                                style={{ paddingRight: '16px', color: '#f8fafc', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                                            />
                                        </div>

                                        <label style={{ marginTop: '16px' }}>Tag Responsible Authority (Optional)</label>
                                        <select 
                                            value={department} 
                                            onChange={(e) => setDepartment(e.target.value)}
                                            style={{ 
                                                width: '100%', padding: '12px 16px', borderRadius: '12px',
                                                background: '#181c2e', border: '1px solid rgba(255,255,255,0.15)',
                                                color: '#f8fafc', fontSize: '0.95rem', fontFamily: 'inherit',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <option value="" style={{ background: '#181c2e', color: '#f8fafc' }}>-- Let AI Decide Automatically --</option>
                                            <option value="police" style={{ background: '#181c2e', color: '#f8fafc' }}>Police Department</option>
                                            <option value="municipal" style={{ background: '#181c2e', color: '#f8fafc' }}>Municipal Corporation</option>
                                            <option value="traffic" style={{ background: '#181c2e', color: '#f8fafc' }}>Traffic Police</option>
                                            <option value="electricity" style={{ background: '#181c2e', color: '#f8fafc' }}>Electricity Board</option>
                                            <option value="water" style={{ background: '#181c2e', color: '#f8fafc' }}>Water & Sanitation</option>
                                            <option value="health" style={{ background: '#181c2e', color: '#f8fafc' }}>Public Health Dept</option>
                                            <option value="environment" style={{ background: '#181c2e', color: '#f8fafc' }}>Environmental Control</option>
                                        </select>
                                    </div>

                                    <div className="priority-pills">
                                        <div className={`p_pill ${aiResult?.severity?.toLowerCase()}`}>
                                            <AlertTriangle size={14} /> {aiResult?.severity} Severity
                                        </div>
                                        <div className="p_pill urgency">
                                            <Clock size={14} /> {aiResult?.urgency || 'Medium'} Urgency
                                        </div>
                                    </div>

                                    {/* Submission Warning Banner when Invalid */}
                                    {isInvalidReport && (
                                        <div style={{
                                            background: 'rgba(239, 68, 68, 0.15)',
                                            border: '1px solid rgba(239, 68, 68, 0.4)',
                                            color: '#f87171',
                                            padding: '14px 16px',
                                            borderRadius: '14px',
                                            marginBottom: '16px',
                                            fontSize: '0.85rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px'
                                        }}>
                                            <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                                            <div>
                                                <strong style={{ color: '#fca5a5' }}>Submission Disabled:</strong>{' '}
                                                {isNoProblem 
                                                    ? `AI detected no civic problem in this photo ("${aiResult?.detected_issue || 'None'}"). Please retake a photo of a valid civic issue.`
                                                    : `AI confidence score is too low (${confidenceScore}% < 50%). Please retake a clearer photo.`
                                                }
                                            </div>
                                        </div>
                                    )}

                                    <div className="submission-actions">
                                        <button className="btn btn-ghost flex-1" onClick={() => setStep('camera')}>
                                            <RotateCcw size={18} /> Retake
                                        </button>
                                        <button 
                                            className={`btn btn-primary flex-2 ${isInvalidReport ? 'btn-disabled' : ''}`} 
                                            onClick={handleSubmit}
                                            disabled={isSubmitting || isInvalidReport}
                                            title={isInvalidReport ? (isNoProblem ? 'No civic problem detected' : 'Confidence score too low (< 50%)') : 'Submit Report'}
                                        >
                                            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Submit Report'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })()}

                    {step === 'success' && (
                        <motion.div 
                            key="success"
                            initial={{ scale: 0.9, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            className="flex-center bg-dark"
                            style={{ position: 'absolute', inset: 0, zIndex: 100 }}
                        >
                            <div className="text-center success-view-inner">
                                <div className="success-glow" style={{ marginBottom: '24px' }}>
                                    <CheckCircle2 size={80} color="#10b981" style={{ margin: '0 auto' }} />
                                </div>
                                <h2 className="mt-l">Report ID: {reportId}</h2>
                                <h3 className="text-blue mt-s" style={{ fontSize: '1.5rem' }}>Successfully Received</h3>
                                <p className="text-muted mt-m" style={{ fontSize: '1.1rem', lineHeight: 1.6 }}>
                                    Your report has been logged. <br />
                                    Use the ID above to track resolution status.
                                </p>
                                <button className="btn btn-primary mt-xl w-full" style={{ padding: '18px' }} onClick={() => navigate('/citizen-reports')}>
                                    View All Citizen Reports
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            <style dangerouslySetInnerHTML={{ __html: `
                .report-full-page {
                    position: fixed;
                    inset: 0;
                    background: rgba(9, 9, 11, 0.85);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    color: #f8fafc !important;
                    z-index: 10000;
                    display: flex;
                    flex-direction: column;
                    font-family: 'Plus Jakarta Sans', sans-serif;
                }
                .report-full-page textarea, 
                .report-full-page input {
                    color: #f8fafc !important;
                    background: rgba(255, 255, 255, 0.08) !important;
                    border: 1px solid rgba(255, 255, 255, 0.15) !important;
                }
                .report-full-page textarea::placeholder,
                .report-full-page input::placeholder {
                    color: rgba(248, 250, 252, 0.5) !important;
                }
                .report-full-page select {
                    color: #f8fafc !important;
                    background: #181c2e !important;
                    border: 1px solid rgba(255, 255, 255, 0.15) !important;
                }
                .report-full-page select option {
                    background: #181c2e !important;
                    color: #f8fafc !important;
                }
                .guided-header {
                    height: 68px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 24px;
                    background: rgba(14, 14, 18, 0.8);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    z-index: 10;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                }
                .step-indicator { display: flex; gap: 8px; }
                .step-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255, 255, 255, 0.15); transition: all 0.3s; }
                .step-dot.active { background: #A881FE; width: 24px; border-radius: 10px; box-shadow: 0 0 10px rgba(168, 129, 254, 0.5); }
                .step-dot.done { background: #10b981; }

                .guided-container { flex: 1; position: relative; overflow: hidden; }

                /* Intro View */
                .intro-view { height: 100%; display: flex; align-items: center; justify-content: center; padding: 20px; overflow-y: auto; }
                .intro-content { max-width: 600px; width: 100%; text-align: center; }
                .main-title { font-size: 2.5rem; font-weight: 800; color: #ffffff; letter-spacing: -0.03em; }
                .subtitle { color: #a1a1aa; font-size: 1.1rem; margin-bottom: 40px; }
                .how-it-works-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 40px; }
                .work-card { background: rgba(18, 18, 24, 0.65); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); padding: 24px; border-radius: 20px; text-align: left; transition: all 0.3s; }
                .work-card:hover { background: rgba(18, 18, 24, 0.85); border-color: rgba(168, 129, 254, 0.4); transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4); }
                .card-icon { color: #A881FE; margin-bottom: 16px; }
                .work-card h4 { font-size: 1.1rem; margin-bottom: 8px; color: #ffffff; font-weight: 700; }
                .work-card p { font-size: 0.85rem; color: #a1a1aa; line-height: 1.5; }
                .start-btn { padding: 20px; font-size: 1.1rem; border-radius: 16px; margin-top: 20px; background: radial-gradient(59.46% 220% at 50% 100%, #A881FE 0%, #6419FF 100%); border: none; font-weight: 700; cursor: pointer; box-shadow: 0 4px 18px rgba(168, 129, 254, 0.4); color: white; }
                .ml-s { margin-left: 8px; }

                /* Camera Styles */

                .camera-fullscreen { position: absolute; inset: 0; background: black; }
                .camera-loading-overlay {
                    position: absolute; inset: 0; 
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    background: #09090b; z-index: 5; color: white;
                }
                .video-el { width: 100%; height: 100%; object-fit: cover; }
                .video-el.mirrored { transform: scaleX(-1); }
                
                .camera-overlay { 
                    position: absolute; inset: 0; 
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    pointer-events: none;
                }
                .guide-box {
                    width: 75%; aspect-ratio: 1;
                    border: 1px solid rgba(255,255,255,0.2);
                    position: relative;
                }
                .corner { position: absolute; width: 24px; height: 24px; border: 3px solid #6366f1; }
                .tl { top: -2px; left: -2px; border-right: 0; border-bottom: 0; }
                .tr { top: -2px; right: -2px; border-left: 0; border-bottom: 0; }
                .bl { bottom: -2px; left: -2px; border-right: 0; border-top: 0; }
                .br { bottom: -2px; right: -2px; border-left: 0; border-top: 0; }
                .overlay-hint { margin-top: 30px; font-size: 0.9rem; background: rgba(0,0,0,0.6); padding: 8px 16px; border-radius: 20px; color: white; }
                .live-location-badge { 
                    position: absolute; top: 20px; right: 20px; 
                    background: rgba(0,0,0,0.5); backdrop-filter: blur(10px); 
                    padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; 
                    display: flex; align-items: center; gap: 6px; color: #818cf8; 
                }

                .camera-actions-bar {
                    position: absolute; bottom: 40px; left: 0; right: 0;
                    display: flex; align-items: center; justify-content: space-evenly;
                    padding: 0 40px;
                    z-index: 20;
                }
                .main-capture-btn {
                    width: 76px; height: 76px; border-radius: 50%; border: 4px solid white;
                    background: transparent; padding: 5px; cursor: pointer;
                    transition: all 0.3s;
                }
                .main-capture-btn.disabled { opacity: 0.3; cursor: not-allowed; border-color: #64748b; }
                .main-capture-btn.disabled .inner-circle { background: #64748b; }
                .inner-circle { width: 100%; height: 100%; background: white; border-radius: 50%; transition: transform 0.1s; }
                .main-capture-btn:active .inner-circle { transform: scale(0.9); }
                .icon-btn, .action-sub-btn { 
                    background: rgba(0,0,0,0.5); border: none; color: white; 
                    width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                }

                /* Analysis Area */
                .analysis-fullscreen { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; }
                .blur-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: blur(30px) brightness(0.4); transform: scale(1.1); }
                .analysis-content { position: relative; text-align: center; color: white; }
                .ai-scanning-ring { position: relative; width: 120px; height: 120px; margin: 0 auto; display: flex; align-items: center; justify-content: center; }
                .sparkle-active { color: #818cf8; animation: pulse-scale 2s infinite; }
                .scan-line { position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: #6366f1; box-shadow: 0 0 15px #6366f1; animation: scanning 2s linear infinite; }

                /* Details View */
                .details-view { 
                    padding: 20px; height: 100%; overflow-y: auto; 
                }
                .details-card { padding: 24px; border-radius: 24px; max-width: 540px; margin: 0 auto; background: #12131a; border: 1px solid rgba(255,255,255,0.12); color: #f8fafc; }
                .results-header { display: flex; gap: 16px; margin-bottom: 24px; align-items: center; }
                .result-img-box { width: 80px; height: 80px; border-radius: 12px; overflow: hidden; flex-shrink: 0; border: 2px solid #6366f1; }
                .result-img-box img { width: 100%; height: 100%; object-fit: cover; }
                .result-meta h3 { margin: 4px 0; font-size: 1.25rem; color: #f8fafc; }
                .badge-ai { font-size: 0.65rem; color: #818cf8; background: rgba(99, 102, 241, 0.1); padding: 4px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; text-transform: uppercase; font-weight: 700; }
                .confidence-label { font-size: 0.8rem; color: #10b981; font-weight: 600; }

                .location-row { display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: #94a3b8; margin-bottom: 24px; padding: 12px; background: rgba(255,255,255,0.04); border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); }
                .timestamp { margin-left: auto; }

                .form-section label { display: block; font-size: 0.85rem; color: #cbd5e1; margin-bottom: 8px; font-weight: 600; }
                .ai-textarea-container { position: relative; margin-bottom: 12px; }
                textarea { width: 100%; border-radius: 16px; padding: 16px; resize: none; font-family: inherit; line-height: 1.5; font-size: 0.95rem; }
                .mic-floating-btn { position: absolute; right: 12px; bottom: 12px; width: 48px; height: 48px; border-radius: 50%; background: #1e293b; border: 1px solid rgba(255,255,255,0.1); color: #f8fafc; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.3); transition: all 0.3s; }
                .mic-floating-btn.active { background: #ef4444; color: white; animation: pulse-red 1s infinite; }
                .mic-hint { font-size: 0.75rem; color: #94a3b8; text-align: center; }

                .priority-pills { display: flex; gap: 10px; margin: 24px 0; }
                .p_pill { flex: 1; padding: 10px; border-radius: 10px; font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid rgba(255,255,255,0.1); }
                .p_pill.high { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
                .p_pill.medium { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
                .p_pill.urgency { background: rgba(99, 102, 241, 0.15); color: #818cf8; }

                .submission-actions { display: flex; gap: 12px; margin-top: 24px; }
                .btn { padding: 14px 20px; border-radius: 14px; border: none; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; }
                .btn-primary { background: #6366f1; color: white; }
                .btn-primary:active:not(:disabled) { transform: scale(0.98); }
                .btn-primary.btn-disabled, 
                .btn-primary:disabled {
                    background: #334155 !important;
                    color: #64748b !important;
                    cursor: not-allowed !important;
                    box-shadow: none !important;
                    opacity: 0.6;
                }
                .btn-ghost { background: rgba(255,255,255,0.06); color: #f8fafc; border: 1px solid rgba(255,255,255,0.12); }

                /* Mobile Responsiveness */
                @media (max-width: 640px) {
                    .how-it-works-grid { grid-template-columns: 1fr !important; }
                    .main-title { font-size: 1.8rem !important; }
                    .details-card { padding: 16px !important; border-radius: 16px !important; }
                    .results-header { flex-direction: column !important; text-align: center !important; }
                    .submission-actions { flex-direction: column !important; }
                    .priority-pills { flex-direction: column !important; }
                }

                /* Utils */
                .text-center { text-align: center; }
                .text-muted { color: #94a3b8; }
                .text-blue { color: #6366f1; }
                .mt-s { margin-top: 8px; } .mt-m { margin-top: 16px; } .mt-l { margin-top: 24px; } .mt-xl { margin-top: 32px; }
                .w-full { width: 100%; }
                .flex-center { display: flex; align-items: center; justify-content: center; height: 100%; }
                .bg-dark { background: #09090b; }
                .success-view-inner { max-width: 480px; width: 100%; padding: 40px; }
                .glass-premium { background: rgba(18, 19, 26, 0.95); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.12); }

                @keyframes scanning { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } }
                @keyframes pulse-scale { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.7; } }
                @keyframes pulse-red { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 100% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); } }
                .animate-pulse { animation: pulse 2s infinite; }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
            ` }} />
        </div>
    );
};

export default ReportIssue;
