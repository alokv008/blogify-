const Blog = require('../models/Blog');
const fs = require('fs');
const path = require('path');

// @route  POST /api/blogs
// @desc   Create a new blog post (with optional cover image)
const createBlog = async (req, res) => {
  try {
    const { title, content, tags } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const coverImage = req.file ? `/uploads/${req.file.filename}` : '';
    const parsedTags = tags ? tags.split(',').map((t) => t.trim()) : [];

    const blog = await Blog.create({
      title,
      content,
      tags: parsedTags,
      coverImage,
      author: req.user._id,
    });

    return res.status(201).json(blog);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @route  GET /api/blogs
// @desc   Get all blogs (with pagination)
const getBlogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const blogs = await Blog.find()
      .populate('author', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Blog.countDocuments();

    return res.status(200).json({
      blogs,
      page,
      totalPages: Math.ceil(total / limit),
      totalBlogs: total,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @route  GET /api/blogs/:id
// @desc   Get a single blog by id
const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).populate('author', 'name email avatar');
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    return res.status(200).json(blog);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @route  PUT /api/blogs/:id
// @desc   Update a blog (only by its author)
const updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    if (blog.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this blog' });
    }

    const { title, content, tags } = req.body;

    if (req.file) {
      // remove old cover image if it exists
      if (blog.coverImage) {
        const oldPath = path.join(__dirname, '..', blog.coverImage);
        fs.unlink(oldPath, () => {});
      }
      blog.coverImage = `/uploads/${req.file.filename}`;
    }

    blog.title = title || blog.title;
    blog.content = content || blog.content;
    blog.tags = tags ? tags.split(',').map((t) => t.trim()) : blog.tags;

    const updatedBlog = await blog.save();
    return res.status(200).json(updatedBlog);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @route  DELETE /api/blogs/:id
// @desc   Delete a blog (only by its author)
const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    if (blog.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this blog' });
    }

    if (blog.coverImage) {
      const imgPath = path.join(__dirname, '..', blog.coverImage);
      fs.unlink(imgPath, () => {});
    }

    await blog.deleteOne();
    return res.status(200).json({ message: 'Blog deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { createBlog, getBlogs, getBlogById, updateBlog, deleteBlog };
