const { getBusinessById, updateBusiness } = require('../models/businessModel');
const { uploadImage } = require('../utils/cloudinaryUpload');

async function fetchBusiness(req, res, next) {
  try {
    const business = await getBusinessById(req.params.id);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }
    res.json(business);
  } catch (error) {
    next(error);
  }
}

async function modifyBusiness(req, res, next) {
  try {
    const businessId = parseInt(req.params.id, 10);
    if (req.business.id !== businessId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const fields = {};
    const allowed = ['shop_name', 'gst_number', 'city', 'latitude', 'longitude', 'description'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        fields[field] = req.body[field];
      }
    });

    if (req.file) {
      const imageUrl = await uploadImage(req.file, 'dealerconnect/profiles');
      fields.profile_image_url = imageUrl;
    }

    const updated = await updateBusiness(businessId, fields);
    if (!updated) {
      return res.status(404).json({ error: 'Business update failed' });
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
}

module.exports = { fetchBusiness, modifyBusiness };
