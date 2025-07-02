import { useState, useRef } from "react";
import useAuthUser from "../hooks/useAuthUser";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { completeOnboarding } from "../lib/api";
import { LoaderIcon, MapPinIcon, MessagesSquare, ShuffleIcon, X, Check, RotateCcw } from "lucide-react";
import Footer from "../components/Footer";
import ThemeSelector from "../components/ThemeSelector";
import { useThemeStore } from "../store/useThemeStore";
import { useNavigate } from "react-router-dom";

const OnboardingPage = () => {
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();
  const { theme } = useThemeStore();
  const navigate = useNavigate();

  const [formState, setFormState] = useState({
    fullName: authUser?.fullName || "",
    bio: authUser?.bio || "",
    location: authUser?.location || "",
    profilePic: authUser?.profilePic || "",
  });

  // Cropper state
  const [showCropper, setShowCropper] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [cropData, setCropData] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  // Detect edit mode: if user is onboarded, treat as edit
  const isEditMode = !!authUser?.isOnboarded;

  const { mutate: onboardingMutation, isPending } = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: () => {
      toast.success("Profile onboarded successfully");
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      navigate("/");
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || error?.message || "An error occurred");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onboardingMutation(formState);
  };

  // Mouse event handlers for dragging
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - cropData.x,
      y: e.clientY - cropData.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    setCropData(prev => ({
      ...prev,
      x: newX,
      y: newY
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom handlers
  const handleZoomIn = () => {
    setCropData(prev => ({
      ...prev,
      scale: Math.min(prev.scale * 1.2, 3)
    }));
  };

  const handleZoomOut = () => {
    setCropData(prev => ({
      ...prev,
      scale: Math.max(prev.scale / 1.2, 0.5)
    }));
  };

  const handleReset = () => {
    setCropData({ x: 0, y: 0, scale: 1 });
  };

  // Apply crop and close cropper
  const handleApplyCrop = () => {
    if (!imageRef.current || !containerRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 400;
    canvas.width = size;
    canvas.height = size;

    const img = new Image();
    img.onload = () => {
      // Calculate crop dimensions
      const containerRect = containerRef.current.getBoundingClientRect();
      const imageRect = imageRef.current.getBoundingClientRect();
      
      const cropSize = Math.min(containerRect.width, containerRect.height);
      const imageSize = cropSize * cropData.scale;
      
      const sourceX = (img.width - imageSize) / 2 - cropData.x * cropData.scale;
      const sourceY = (img.height - imageSize) / 2 - cropData.y * cropData.scale;
      
      ctx.drawImage(
        img,
        sourceX, sourceY, imageSize, imageSize,
        0, 0, size, size
      );

      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setFormState({ ...formState, profilePic: croppedDataUrl });
      setShowCropper(false);
      setCropImage(null);
      toast.success("Image cropped successfully!");
    };
    img.src = cropImage;
  };

  const handleCancelCrop = () => {
    setShowCropper(false);
    setCropImage(null);
  };

  // Cropper component
  const ImageCropper = () => (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-2xl p-6 max-w-md w-full">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold">Crop Profile Picture</h3>
          <p className="text-sm opacity-70">Drag to move, use buttons to zoom</p>
        </div>
        
        {/* Cropper Container */}
        <div 
          ref={containerRef}
          className="relative w-64 h-64 mx-auto mb-4 rounded-full overflow-hidden bg-base-300 border-2 border-primary"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {cropImage && (
            <img
              ref={imageRef}
              src={cropImage}
              alt="Crop preview"
              className="absolute w-full h-full object-cover cursor-move"
              style={{
                transform: `translate(${cropData.x}px, ${cropData.y}px) scale(${cropData.scale})`,
                transformOrigin: 'center'
              }}
              draggable={false}
            />
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-2 mb-4">
          <button
            onClick={handleZoomOut}
            className="btn btn-circle btn-sm"
            title="Zoom Out"
          >
            <span className="text-lg">−</span>
          </button>
          <button
            onClick={handleReset}
            className="btn btn-circle btn-sm"
            title="Reset"
          >
            <RotateCcw className="size-4" />
          </button>
          <button
            onClick={handleZoomIn}
            className="btn btn-circle btn-sm"
            title="Zoom In"
          >
            <span className="text-lg">+</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleCancelCrop}
            className="btn btn-outline flex-1"
          >
            <X className="size-4 mr-2" />
            Cancel
          </button>
          <button
            onClick={handleApplyCrop}
            className="btn btn-primary flex-1"
          >
            <Check className="size-4 mr-2" />
            Apply
          </button>
        </div>
      </div>
    </div>
  );

  const handleRandomAvatar = () => {
    const idx = Math.floor(Math.random() * 100) + 1;
    const randomAvatar = `https://avatar.iran.liara.run/public/${idx}.png`;
    setFormState({ ...formState, profilePic: randomAvatar });
    toast.success("Random profile picture generated!");
  };

  // Handle image upload and show cropper
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setCropImage(reader.result);
        setShowCropper(true);
        setCropData({ x: 0, y: 0, scale: 1 });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-base-100 via-base-200 to-base-300" data-theme={theme}>
      {showCropper && <ImageCropper />}
      <div className="flex-grow flex items-center justify-center min-h-[80vh]">
        <div className="border border-primary/10 flex flex-col w-full max-w-md mx-auto bg-base-100 rounded-3xl shadow-xl overflow-hidden my-6 md:my-10 transition-transform duration-300 hover:scale-[1.01]">
          <div className="card-body p-5 sm:p-8 md:p-10 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl sm:text-3xl font-medium" style={{ fontFamily: 'Pacifico, cursive', letterSpacing: '2px' }}>
                <span className="font-aicon">Converse</span>
              </span>
              <ThemeSelector />
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-4">Complete Your Profile</h1>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* PROFILE PIC CONTAINER */}
              <div className="flex flex-col items-center justify-center space-y-3 pb-2 border-b border-base-300 mb-2">
                {/* IMAGE PREVIEW */}
                <div className="avatar size-28 sm:size-32">
                  {formState.profilePic ? (
                    <img
                      src={formState.profilePic}
                      alt="Profile Preview"
                      className="rounded-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full rounded-full bg-base-300">
                      <LoaderIcon className="size-10 sm:size-12 text-base-content opacity-40" />
                    </div>
                  )}
                </div>
                {/* Generate Random Avatar BTN */}
                <div className="flex items-center gap-2">
                  <button type="button" onClick={handleRandomAvatar} className="btn btn-accent btn-sm">
                    <ShuffleIcon className="size-4 mr-2" />
                    Random Avatar
                  </button>
                  <label className="btn btn-outline btn-sm cursor-pointer">
                    Upload Image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>
              </div>
              {/* FULL NAME */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Full Name</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formState.fullName}
                  onChange={(e) => setFormState({ ...formState, fullName: e.target.value })}
                  className="input input-bordered w-full"
                  placeholder="Your full name"
                  required={!isEditMode}
                />
              </div>
              {/* BIO */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Bio</span>
                </label>
                <textarea
                  name="bio"
                  value={formState.bio}
                  onChange={(e) => setFormState({ ...formState, bio: e.target.value })}
                  className="textarea textarea-bordered h-20 md:h-24"
                  placeholder="Tell others about yourself and what you love to chat about!"
                  required={!isEditMode}
                />
              </div>
              {/* LOCATION */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Location</span>
                </label>
                <div className="relative">
                  <MapPinIcon className="absolute top-1/2 transform -translate-y-1/2 left-3 size-5 text-base-content opacity-70" />
                  <input
                    type="text"
                    name="location"
                    value={formState.location}
                    onChange={(e) => setFormState({ ...formState, location: e.target.value })}
                    className="input input-bordered w-full pl-10"
                    placeholder="City, Country"
                    required={!isEditMode}
                  />
                </div>
              </div>
              {/* SUBMIT BUTTON */}
              <button className="btn btn-primary w-full mt-2" disabled={isPending} type="submit">
                {!isPending ? (
                  <>
                    <MessagesSquare className="size-6 mr-2" />
                    {isEditMode ? 'Save Changes' : 'Complete Onboarding'}
                  </>
                ) : (
                  <>
                    <LoaderIcon className="animate-spin size-5 mr-2" />
                    {isEditMode ? 'Saving...' : 'Onboarding...'}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default OnboardingPage;
