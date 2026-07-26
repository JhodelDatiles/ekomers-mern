import AdminSettings from '../../models/adminSettingsSchema.js';
import { cloudinary } from '../../config/cloudinary.js';

export const getStoreSettings = async (req, res) => {
  try {
    let settings = await AdminSettings.findOne();
    if (!settings) {
      settings = await AdminSettings.create({});
    }
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch settings', error: error.message });
  }
};

export const updateStoreSettings = async (req, res) => {
  try {
    const updateData = {
      storeName: req.body.storeName,
      storeDescription: req.body.storeDescription,
      newsletterTitle: req.body.newsletterTitle,
      newsletterSubtitle: req.body.newsletterSubtitle,
      lastUpdatedBy: req.user.id,
    };

    if (req.body.officeAddress) {
      updateData.officeAddress = JSON.parse(req.body.officeAddress);
    }

    if (req.body.socialLinks) {
      updateData.socialLinks = JSON.parse(req.body.socialLinks);
    }

    if (req.body.paymentMethodsRaw) {
      updateData.paymentMethods = req.body.paymentMethodsRaw
        .split(',')
        .map(method => method.trim().toUpperCase());
    }

    if (req.file) {
      const currentSettings = await AdminSettings.findOne();
      if (currentSettings?.storeLogo?.public_id) {
        await cloudinary.uploader.destroy(currentSettings.storeLogo.public_id);
      }
      updateData.storeLogo = {
        url: req.file.path,
        public_id: req.file.filename,
      };
    }

    const settings = await AdminSettings.findOneAndUpdate(
      {},
      { $set: updateData },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json({ message: 'Store settings updated!', settings });
  } catch (error) {
    console.error('CRITICAL SETTINGS ERROR:', error);
    res.status(500).json({ message: 'Failed to update settings', error: error.message });
  }
};