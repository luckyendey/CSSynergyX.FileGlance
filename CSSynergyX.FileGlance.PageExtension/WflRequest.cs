using System;
using System.Web.UI;
using System.Web.UI.HtmlControls;

namespace CSSynergyX.FileGlance.PageExtension
{
    public class WflRequest : Exact.Web.UI.Page.ApplicationExtensionBase
    {
        public override void AfterInit()
        {
            base.AfterInit();
            Exact.Web.UI.Page.Form frmMain = (Exact.Web.UI.Page.Form)page.FindControl("frmMain");

            if (frmMain != null)
            {
                InitFileGlance(frmMain);

            }
        }

        private void InitFileGlance(Exact.Web.UI.Page.Form frmMain)
        {
            HtmlTable tblAttachments = (HtmlTable)frmMain.FindControl("tblAttachments");
            if (tblAttachments != null)
            {
                // Include external JS from /docs and call it with the table ClientID
                var webPage = page as System.Web.UI.Page;
                var cs = webPage?.ClientScript;
                string scriptUrl = webPage != null
                    ? webPage.ResolveUrl("~/docs/CSSynergyX.FileGlance.js")
                    : "/docs/CSSynergyX.FileGlance.js";

                if (cs != null)
                {
                    string key = "CS_FileGlance_Attachments_ViewButtons";

                    if (!cs.IsClientScriptIncludeRegistered(key))
                    {
                        cs.RegisterClientScriptInclude(key, scriptUrl);
                    }

                    string initKey = key + "_Init_" + tblAttachments.ClientID;
                    string initScript = "window.CSFileGlance && window.CSFileGlance.addViewButtons && window.CSFileGlance.addViewButtons('" + tblAttachments.ClientID + "');";
                    if (!cs.IsStartupScriptRegistered(initKey))
                    {
                        cs.RegisterStartupScript(typeof(WflRequest), initKey, initScript, true);
                    }
                }
                else
                {
                    // Fallback: add <script src> then inline initializer
                    var include = new HtmlGenericControl("script");
                    include.Attributes["type"] = "text/javascript";
                    include.Attributes["src"] = scriptUrl;
                    tblAttachments.Parent.Controls.Add(include);

                    var script = new HtmlGenericControl("script");
                    script.Attributes["type"] = "text/javascript";
                    script.InnerHtml = "window.CSFileGlance && window.CSFileGlance.addViewButtons && window.CSFileGlance.addViewButtons('" + tblAttachments.ClientID + "');";
                    tblAttachments.Parent.Controls.Add(script);
                }
            }
        }
    }
}
