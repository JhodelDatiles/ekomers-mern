import React, { useState, useEffect } from "react";
import {
  X,
  Search,
  Loader2,
  Target,
  Home,
  Briefcase,
  Star,
  User,
  Phone,
  Map as MapIcon,
  Building2,
  MapPinned,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { mapAPI } from "../../services/api";
import FormInput from "../ui/FormInput";
import ModalContainer from "../../components/modals/ModalContainer";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const OrderDetailsModal = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  loading,
}) => {
  const [formData, setFormData] = useState(initialData);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [position, setPosition] = useState([
    formData.lat || 14.5995,
    formData.lng || 120.9842,
  ]);

  useEffect(() => {
    setFormData(initialData);
    if (initialData.lat && initialData.lng) {
      setPosition([initialData.lat, initialData.lng]);
    }
  }, [initialData]);

  function MapInvalidator() {
    const map = useMap();
    useEffect(() => {
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 400);
      return () => clearTimeout(timer);
    }, [map]);
    return null;
  }

  function LocationMarker() {
    const map = useMap();
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setPosition([lat, lng]);
        setFormData((prev) => ({ ...prev, lat, lng }));
        map.flyTo(e.latlng, map.getZoom());
      },
    });
    return <Marker position={position} />;
  }

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length > 3) {
        try {
          const results = await mapAPI.autocomplete(query);
          setSuggestions(results);
        } catch (err) {
          console.error(err);
        }
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleSelectSuggestion = (s) => {
    setPosition([s.lat, s.lng]);
    setFormData({
      ...formData,
      street: s.street || "",
      barangay: s.barangay || "",
      city: s.city || "",
      lat: s.lat,
      lng: s.lng,
    });
    setQuery("");
    setSuggestions([]);
  };

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose} loading={loading}>
      <div className="bg-[#1a1c23] border border-white/10 w-[95vw] max-w-[1100px] rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row h-auto max-h-[90vh]">
        <div className="flex-1 min-h-[300px] md:min-h-full relative bg-black/20 overflow-hidden md:rounded-l-[40px]">
          <MapContainer
            center={position}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            <MapInvalidator />
            <LocationMarker />
          </MapContainer>
          <div className="absolute bottom-6 left-6 z-[400] bg-[#1a1c23]/80 backdrop-blur-xl p-3 rounded-2xl border border-white/10">
            <p className="text-[10px] font-black text-white italic tracking-tighter uppercase flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Signal Locked: {position[0].toFixed(4)}, {position[1].toFixed(4)}
            </p>
          </div>
        </div>

        <div className="flex-1 flex flex-col p-8 md:p-10 overflow-y-auto bg-gradient-to-br from-[#1a1c23] to-[#111217]">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-black uppercase italic text-white tracking-tight">
                Node Config
              </h2>
              <p className="text-[10px] text-primary font-bold uppercase tracking-[0.2em] mt-1 opacity-80">
                Logistics Deployment
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all"
            >
              <X size={20} />
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSave(formData);
            }}
            className="space-y-4"
          >
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"
                  size={16}
                />
                <input
                  className="input input-bordered w-full pl-12 bg-black/20 border-white/10 rounded-2xl text-xs h-12 focus:border-primary/50 text-white italic"
                  placeholder="Scan address network..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {suggestions.length > 0 && (
                  <div className="absolute z-[1000] w-full mt-2 bg-[#1f2129] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectSuggestion(s)}
                        className="w-full p-4 text-left hover:bg-primary/10 border-b border-white/5 text-[11px] text-white/60"
                      >
                        {s.formatted}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
                {["Home", "Work"].map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setFormData({ ...formData, label })}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase italic transition-all ${
                      formData.label === label
                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                        : "text-white/40 hover:text-white"
                    }`}
                  >
                    {label === "Home" ? (
                      <Home size={14} />
                    ) : (
                      <Briefcase size={14} />
                    )}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Recipient Name"
                icon={User}
                value={formData.fullName}
                maxLength={30}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
              />
              <FormInput
                label="Contact Sequence"
                icon={Phone}
                value={formData.contactNumber}
                maxLength={11}
                isNumeric={true}
                onChange={(e) =>
                  setFormData({ ...formData, contactNumber: e.target.value })
                }
              />
            </div>

            <FormInput
              label="Street / Building / Unit"
              icon={Building2}
              value={formData.street}
              maxLength={100}
              onChange={(e) =>
                setFormData({ ...formData, street: e.target.value })
              }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormInput
                label="Barangay"
                icon={MapIcon}
                value={formData.barangay}
                maxLength={50}
                onChange={(e) =>
                  setFormData({ ...formData, barangay: e.target.value })
                }
              />
              <FormInput
                label="City / Muni."
                icon={MapPinned}
                value={formData.city}
                maxLength={50}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
              />
              <FormInput
                label="Postal Code"
                icon={Target}
                value={formData.postalCode}
                maxLength={10}
                isNumeric={true}
                onChange={(e) =>
                  setFormData({ ...formData, postalCode: e.target.value })
                }
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${formData.isDefault ? "bg-primary/20 text-primary" : "text-white/20"}`}
                >
                  <Star
                    size={16}
                    fill={formData.isDefault ? "currentColor" : "none"}
                  />
                </div>
                <p className="text-[10px] font-black uppercase text-white">
                  Set as Primary Node
                </p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary toggle-sm"
                checked={formData.isDefault}
                onChange={(e) =>
                  setFormData({ ...formData, isDefault: e.target.checked })
                }
              />
            </div>

            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-ghost flex-1 rounded-2xl text-[11px] font-black uppercase italic border border-white/5 text-white"
              >
                Abort
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary flex-1 rounded-2xl text-[11px] font-black uppercase italic text-white"
              >
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  "Authorize Node"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalContainer>
  );
};

export default OrderDetailsModal;
