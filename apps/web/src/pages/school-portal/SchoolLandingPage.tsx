import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { websiteApi } from '../../services/api';
import { applyThemeColors } from '../../hooks/useTenantTheme';
import toast from 'react-hot-toast';
import { GraduationCap, ArrowLeft, Search, School } from 'lucide-react';

// Import the 5 Distinct Layout Templates
import ModernAcademyTemplate from './templates/ModernAcademyTemplate';
import ClassicHeritageTemplate from './templates/ClassicHeritageTemplate';
import VibrantCampusTemplate from './templates/VibrantCampusTemplate';
import MinimalExcellenceTemplate from './templates/MinimalExcellenceTemplate';
import ComprehensiveCommunityTemplate from './templates/ComprehensiveCommunityTemplate';

export default function SchoolLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: websiteData, isLoading, isError } = useQuery({
    queryKey: ['school-website', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Missing school slug');
      const res = await websiteApi.getPublicWebsite(slug);
      return res.data?.data;
    },
    retry: 1,
  });

  useEffect(() => {
    if (websiteData?.branding) {
      applyThemeColors({
        primaryColor: websiteData.branding.primaryColor,
        secondaryColor: websiteData.branding.secondaryColor,
        name: websiteData.branding.name,
        logo: websiteData.branding.logo,
      });
    }
  }, [websiteData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-500">Connecting to school website...</p>
        </div>
      </div>
    );
  }

  // Graceful 404 School Not Found
  if (isError || !websiteData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-slate-100 text-center space-y-6">
          <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto text-slate-400">
            <School size={40} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">School Portal Not Found</h1>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              We couldn't locate any active institution with the address <span className="font-mono text-slate-800 font-bold">"{slug}"</span>. Please verify the link or return to the platform directory.
            </p>
          </div>
          <div className="space-y-3 pt-2">
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} /> Return to EduNest Home
            </button>
            <button
              onClick={() => navigate('/saas/register')}
              className="w-full py-3 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
            >
              Register Your School on EduNest
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleApplyClick = () => {
    navigate(`/school/${slug}/apply`);
  };

  const handlePortalClick = () => {
    navigate(`/login/${slug}`);
  };

  const handleSubmitInquiry = async (form: any) => {
    try {
      const res = await websiteApi.submitInquiry(slug!, form);
      toast.success(res.data?.message || 'Inquiry submitted successfully!');
      return res.data;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit inquiry. Please try again.');
      throw err;
    }
  };

  // Select the appropriate template
  const template = websiteData.template || 'MODERN_ACADEMY';

  switch (template) {
    case 'CLASSIC_HERITAGE':
      return (
        <ClassicHeritageTemplate
          data={websiteData}
          onApplyClick={handleApplyClick}
          onPortalClick={handlePortalClick}
          onSubmitInquiry={handleSubmitInquiry}
        />
      );
    case 'VIBRANT_CAMPUS':
      return (
        <VibrantCampusTemplate
          data={websiteData}
          onApplyClick={handleApplyClick}
          onPortalClick={handlePortalClick}
          onSubmitInquiry={handleSubmitInquiry}
        />
      );
    case 'MINIMAL_EXCELLENCE':
      return (
        <MinimalExcellenceTemplate
          data={websiteData}
          onApplyClick={handleApplyClick}
          onPortalClick={handlePortalClick}
          onSubmitInquiry={handleSubmitInquiry}
        />
      );
    case 'COMPREHENSIVE_COMMUNITY':
      return (
        <ComprehensiveCommunityTemplate
          data={websiteData}
          onApplyClick={handleApplyClick}
          onPortalClick={handlePortalClick}
          onSubmitInquiry={handleSubmitInquiry}
        />
      );
    case 'MODERN_ACADEMY':
    default:
      return (
        <ModernAcademyTemplate
          data={websiteData}
          onApplyClick={handleApplyClick}
          onPortalClick={handlePortalClick}
          onSubmitInquiry={handleSubmitInquiry}
        />
      );
  }
}
